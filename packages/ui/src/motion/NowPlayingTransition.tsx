import { motion } from '@lavender/design-system';
import type { ArtworkPalette } from '@lavender/shared';
import { useEffect, useReducer } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { Artwork } from '../Artwork';

/**
 * Mini player → Now Playing geometry transition.
 *
 * The stack has no shared-element API (expo-router/React Navigation), so this is
 * the closest reliable alternative rather than a claim of matched geometry:
 * both ends measure their artwork in window coordinates, and a single overlay
 * artwork animates between those two real rectangles. Because the artwork is
 * square in both states, the motion is a pure translate + uniform scale, which
 * stays on the compositor and never distorts the cover.
 *
 * The border radius is compensated for the scale (`radius * 1/scale`), so the
 * corner looks identical at both ends of the flight.
 */

export interface TransitionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransitionMeta {
  palette: ArtworkPalette;
  uri?: string;
  /** Identifies the visual content, so a changed track restarts the flight. */
  trackId: string;
}

type Phase = 'idle' | 'expanding' | 'expanded' | 'collapsing';

interface Snapshot {
  phase: Phase;
  from: TransitionRect | null;
  to: TransitionRect | null;
  meta: TransitionMeta | null;
  /** Hides the destination artwork while the overlay is in flight. */
  hideHero: boolean;
  /** Hides the overlay while geometry is still being measured. */
  visible: boolean;
}

const listeners = new Set<() => void>();
const progress = new Animated.Value(0);

let snapshot: Snapshot = {
  phase: 'idle',
  from: null,
  to: null,
  meta: null,
  hideHero: false,
  visible: false,
};

let miniRect: TransitionRect | null = null;
let heroRect: TransitionRect | null = null;
/** The flight is only committed once the destination has measured. */
let flightStarted = false;
let holdTimer: ReturnType<typeof setTimeout> | null = null;
/** Last resort so a collapse can never leave the UI stuck. */
let useReducedMotion = false;
let onCollapsed: (() => void) | null = null;

function publish(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

export function setNowPlayingMotionReduced(reduced: boolean) {
  useReducedMotion = reduced;
}

/** Called from the mini player artwork layout; window coordinates. */
export function registerMiniArtworkRect(rect: TransitionRect) {
  miniRect = rect;
}

/** Called from the Now Playing hero layout; window coordinates. */
export function registerHeroArtworkRect(rect: TransitionRect) {
  heroRect = rect;
  if (snapshot.phase === 'expanding' && !flightStarted) {
    startExpansion(rect);
  }
}

export function setNowPlayingCollapsedHandler(handler: (() => void) | null) {
  onCollapsed = handler;
}

/** True while a flight is in progress; used to ignore rapid repeat taps. */
export function isNowPlayingTransitioning(): boolean {
  return snapshot.phase === 'expanding' || snapshot.phase === 'collapsing';
}

/** True when the animation should be skipped and navigation should just happen. */
export function nowPlayingMotionReduced(): boolean {
  return useReducedMotion;
}

/**
 * Starts the expansion. Returns `true` when an animated flight was set up, so
 * the caller knows whether to expect the overlay to cover the navigation.
 */
export function beginNowPlayingExpansion(meta: TransitionMeta): boolean {
  if (useReducedMotion || !miniRect || isNowPlayingTransitioning()) return false;
  progress.setValue(0);
  flightStarted = false;
  // The cover parks over the mini player slot immediately, while the pushed
  // screen lays itself out. Without this the artwork is briefly missing from
  // both ends: the mini player is covered and the overlay has no destination.
  publish({
    phase: 'expanding',
    from: miniRect,
    to: miniRect,
    meta,
    hideHero: true,
    visible: true,
  });
  // If the destination never measures (navigation failed), never leave a cover
  // parked over the mini slot.
  if (holdTimer) clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    holdTimer = null;
    if (!flightStarted) cancelNowPlayingTransition();
  }, 1200);
  return true;
}

function startExpansion(target: TransitionRect) {
  flightStarted = true;
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
  // Retargeting at progress 0 does not move the cover: the transform still
  // resolves to the mini rectangle, only the shadow and radius basis change.
  publish({ to: target, visible: true });
  const animation = Animated.spring(progress, {
    toValue: 1,
    useNativeDriver: Platform.OS !== 'web',
    overshootClamping: false,
    ...motion.spring.expand,
  });
  animation.start(({ finished }) => {
    if (!finished) return;
    publish({ phase: 'expanded', hideHero: false, visible: false });
  });
}

/**
 * Reverse flight: the hero artwork returns to the mini player slot, then the
 * navigation back home is committed. The mini player mounts underneath the
 * overlay at the same rect, so the hand-off is invisible.
 */
export function beginNowPlayingCollapse(meta: TransitionMeta): boolean {
  if (snapshot.phase === 'collapsing') return true;
  const target = miniRect;
  if (useReducedMotion || !heroRect || !target) {
    onCollapsed?.();
    return false;
  }
  progress.setValue(1);
  publish({
    phase: 'collapsing',
    from: target,
    to: heroRect,
    meta,
    hideHero: true,
    visible: true,
  });
  const animation = Animated.timing(progress, {
    toValue: 0,
    duration: motion.morph,
    easing: Easing.bezier(...motion.easingBezier.emphasized),
    useNativeDriver: Platform.OS !== 'web',
  });
  animation.start(({ finished }) => {
    if (!finished) return;
    publish({ phase: 'idle', hideHero: false, visible: false, from: null, to: null });
    onCollapsed?.();
  });
  return true;
}

/** Guards against a transition being abandoned by an interrupted navigation. */
export function cancelNowPlayingTransition() {
  flightStarted = false;
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
  progress.stopAnimation();
  publish({ phase: 'idle', hideHero: false, visible: false, from: null, to: null });
}

export function useNowPlayingTransition(): Snapshot {
  const [, force] = useReducer((value: number) => value + 1, 0);
  useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, [force]);
  return snapshot;
}

/**
 * The travelling cover. Rendered once, above the app shell, while a transition
 * is active.
 */
export function NowPlayingArtworkTransition() {
  const state = useNowPlayingTransition();
  const { from, to, meta, visible } = state;
  if (!visible || !from || !to || !meta) return null;

  const scaleFrom = from.width / to.width;
  // Visual radius must stay constant through the flight: the wrapper scales
  // uniformly, so the geometric radius is divided by the scale at each end.
  const radiusFrom = 9 / scaleFrom;
  const radiusTo = 18;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 60 }]}>
      <Animated.View
        testID="artwork-flight"
        style={[
          {
            position: 'absolute',
            left: to.x,
            top: to.y,
            width: to.width,
            height: to.height,
            overflow: 'hidden',
            borderRadius: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [radiusFrom, radiusTo],
            }),
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [from.x + from.width / 2 - (to.x + to.width / 2), 0],
                }),
              },
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [from.y + from.height / 2 - (to.y + to.height / 2), 0],
                }),
              },
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [scaleFrom, 1],
                }),
              },
            ],
            boxShadow: '0px 24px 48px rgba(46, 34, 56, 0.22)',
          },
        ]}>
        <Artwork palette={meta.palette} uri={meta.uri} size={to.width} cornerRadius={0} />
      </Animated.View>
    </View>
  );
}
