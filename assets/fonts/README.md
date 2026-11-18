# assets/fonts

Intentionally empty in Phase 01.

Lavender Music uses the platform system font — SF Pro on iOS, Segoe UI Variable
on Windows, `system-ui` in browsers — which matches the Apple Music reference and
keeps the first paint instant with no font loading state.

If a custom face is introduced later (for example a display serif for editorial
sections), add the file here, load it with `expo-font`, and register it in the
typography tokens rather than referencing it from components.
