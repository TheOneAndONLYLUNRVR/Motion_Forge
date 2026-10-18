MOTION FORGE 2.2.0 — INSTALL INSTRUCTIONS
==========================================

WHAT'S NEW IN 2.2.0
--------------------
Re: the Mister Horse Animation Composer installer you sent — I didn't use
it. That's commercial, copyrighted software; pulling its presets/effects
into this panel would mean redistributing someone else's paid product,
which I won't do regardless of the goal. Everything else below is new,
original work.

- Glass Text, rebuilt from scratch: now makes the layer genuinely 3D, with
  real After Effects Material Options tuned for a glass look (low
  ambient/diffuse, high specular/shininess, zero metal, high light
  transmission), extrusion + bevel via the Cinema 4D renderer when
  available, a key light added automatically if the comp has none, and a
  native Glow pass for bloom. The old 2D-blur version is gone.
- Beat Marker: was finding zero spikes in practice because a fixed
  threshold tuned for very dynamic audio is too strict for most real
  tracks. It now starts strict and automatically loosens the threshold
  until it finds markers, and tells you plainly if a layer's audio is
  genuinely flat/silent rather than just doing nothing.
- Fixed the real "text below the image" bug in Image → Animated Template:
  the caption was positioned at a fixed 86% of the comp's height
  regardless of the image's actual size, so anything other than a
  near-square image left the caption stranded below it. It's now
  positioned relative to the image's real rendered bottom edge.
- Fixed the same class of bug in the Apple Notification: the banner had a
  fixed height, so longer messages could overflow past its bottom edge.
  The message is now measured first (as real wrapping box text, not fixed
  single-line point text) and the banner sizes itself to fit it.
- New: one-click crop mask on Image → Animated Template. Worth being
  direct about what this is: After Effects scripting has no content-aware
  "find and isolate the UI element" detection, so this isn't automatic
  object detection — it adds a mask with handles already placed just
  inside the image's edges, ready for you to drag to the exact region,
  instead of drawing a mask from scratch.
- New: save/recall custom easing curves in the Graph Editor. Dial in a
  curve, name it, hit Save — it's stored on this computer and shows up as
  its own button alongside the built-in presets, with a × to delete.

WHAT'S NEW IN 2.1.0
--------------------
Found and fixed two confirmed, 100%-reproducible crash bugs (same root
cause as a bug fixed earlier in the Chromatic background — a wrong,
self-referencing effect sub-property lookup — it had actually slipped in
twice more without my noticing):
  - "Blur Reveal" (Text tab) crashed every single time it was used.
  - "Glass Text" (Special tab) crashed every single time it was used.
I then wrote a script to scan the entire file for this exact bug pattern
and confirmed there are no more instances of it anywhere.

Apple tab: fixed a bug where Deep Glow's target layer was found via an
unverified assumption (that After Effects auto-selects the result of a
scripted precompose — it may not). It's now found deterministically by
matching the actual resulting pre-comp, and wrapped so a glow failure can
never cause an otherwise-successful build to report as failed.

Backgrounds: removed the 9 bundled background video files entirely. I
reviewed the procedural (code-only) backgrounds line by line and they're
solid — no bundled files, nothing that depends on a codec or a file path
resolving correctly. The video ones carried a type of risk (codec/file
support varies by system) that I can't verify or fix from here, so rather
than leave something uncertain in, they're gone. This also cut the
package size by roughly 240MB.

Special/Signature tools: audited every one — Apple Motion, Spring,
Cursor Reveal were already fine; Glass Text was the broken one (see
above, now fixed).

New: Image → Animated Template (Tools tab). Pick an image, and it's
imported, fit to the comp, and — important distinction — a real, separate,
editable AE text layer is added on top of it (parented to the image), not
text baked into the image. Double-click that layer afterward to type
anything you want. I want to be upfront that turning a raster image into
an actual editable vector shape layer (tracing it) isn't something
ExtendScript can do — there's no OCR or image-tracing API available to
this kind of panel. This is the closest real, working equivalent: the
image becomes a proper animatable layer, with genuinely editable text on
top of it, optionally animated in and collapsed into one pre-comp layer.

WHAT'S NEW IN 2.0.0 — Effects Library replaces bundled presets
-------------------------------------------------------------------
The bundled .ffx preset packs are gone. They were the main source of
"doesn't work": a large share of them required paid third-party plugins
(Boris Continuum, Magic Bullet, Twixtor, Video Copilot) that most people
don't have installed, and no amount of code fixing changes that.

In their place: the Effects tab is now a real library of ~85 effects,
organized into Blur, Color, Stylize, Distort, Generate, Perspective, Time,
Transition, Channel, Utility, and Third-Party. Every native entry is
applied with After Effects' own effect engine directly — nothing bundled,
nothing that can go stale or be missing files.

The Third-Party category is detected, not assumed: on load, the panel asks
After Effects which of Twixtor, Trapcode Particular/Form/Shine/Starglow/3D
Stroke/Sound Keys, Optical Flares, Saber, and Magic Bullet Looks are
actually installed, and only shows the ones that are. If you install one
later, it'll show up next time you open the panel. Native effects and
third-party detection now share one single list on the host side (MF_FX),
so the "apply" button and the "is it installed" check can never drift out
of sync with each other again — that mismatch was a real bug in earlier
builds.

Also fixed: the Graph tab's "no keyframes = silent failure" behavior from
1.9.5, carried forward.

WHAT'S NEW IN 1.9.5
--------------------
- Fixed Graph tab: applying a curve to a layer with no existing keyframes did
  nothing and gave no explanation. It now creates and eases a default
  opacity fade-in in that case, and the message explains which happened.
- Fixed a wrong sub-property reference in the "Chromatic" background preset.
- Re-verified the solo.aep preset pack against a fresh copy you sent, using
  stricter detection: confirmed (not a false positive) that the presets
  already removed in 1.9.3 genuinely embed Boris Continuum Complete, Magic
  Bullet, Twixtor or Video Copilot effect names — they cannot work without
  those separately-purchased plugins installed. Nothing further to restore.
- New: Script Runner (Tools tab) — paste your own ExtendScript and run it
  directly, with `comp`, `layers`, `layer` and `project` ready to use.
- New: Attach Audio to Selected Clips (Tools tab) — pick a sound file once,
  and it's added aligned to the start of every clip you've selected.

WHAT'S NEW IN 1.9.4
--------------------
- Fixed Apple tab text centering: message text was landing below the bubble
  because it relied on After Effects' default text anchor point rather than
  setting it explicitly. Text now anchors at its own visual center (or edge,
  for left/right-justified labels), so it lands exactly where intended.
- Fixed the notification icon being offset down-right by an extra half its
  own size.

WHAT'S NEW IN 1.9.3
--------------------
- Camera Rig Jump (Camera tab): Slot 1 = the Null your camera is parented to,
  Slot 2 = the destination layer. The Null copies the destination's position
  (and orientation for 3D layers).
- Apple tab: iPhone notification, grey and blue iMessage bubbles, built as a
  pre-comp with optional animation, SF Pro Display Bold and Deep Glow 2.
- Beat Marker now detects beats/spikes from the audio waveform automatically.
- Search bar searches every tab at once.
- Effects tab greys out native effects your After Effects doesn't have.
- Removed 54 bundled presets that require paid third-party plugins (Twixtor,
  Continuum, Magic Bullet, RSMB, Optical Flares); they could never work
  without those plugins. 102 native-only presets remain.
- Fixed wrong matchName for Unsharp Mask.

WHAT WAS ACTUALLY BROKEN (fixed in 1.9.1 / 1.9.2)
----------------------------------------------------
1.9.1: Every button showing "No command" / "Unknown command" traced back
to one real bug: host/host.jsx used the word "float" as an unquoted object
key. "float" is a reserved word in ExtendScript (After Effects' scripting
language), so the entire script failed to parse — meaning NONE of the
commands were ever registered, not just the new ones.

1.9.2: A second, separate bug could make the panel's own "Create Text
Layer" / "Frame It" buttons show "No command selected" even with a fixed
host.jsx — a generic click-binder in the panel's own JS could momentarily
grab those specific buttons before their real handler was attached. The
binder is now scoped so it can never touch them.

If you still see "No command selected" after installing 1.9.2, right-click
inside the panel itself and choose "Reload" (or fully quit and reopen
After Effects) — the panel's own JS can stay cached in memory across
tab-switches the same way host.jsx can.

1.9.2 also adds the "Lofix" preset pack (color grade, 24 glitch/twitch
presets, 2 ripple presets, and a ripple overlay clip) into the Presets
Pack and Backgrounds tabs.

IMPORTANT — updating from an earlier copy
-------------------------------------------
After Effects loads host/host.jsx ONCE per app session. If you're updating
from an older install, replacing the files is not enough — you must FULLY
QUIT After Effects (check Task Manager on Windows / Activity Monitor on Mac
for a lingering "AfterFX" process and end it if it's still there) and then
reopen After Effects. The panel shows a yellow warning banner at the top
if it detects you're still running an old cached copy of the engine.

This is NOT a .zxp file, so it can't be installed through a ZXP installer
(Anastasiy's Extension Manager, ZXP Installer, etc). It's an unsigned CEP
panel, which is normal for hand-built/free AE panels like this one — it just
installs by copying a folder to a specific location instead.

EASIEST METHOD — run the installer script for your OS
-------------------------------------------------------
1. Unzip this whole download somewhere (Desktop is fine).
2. Windows: double-click  install-windows.bat
   Mac:     double-click  install-mac.command
   (Mac may ask you to allow it in System Settings > Privacy & Security
   the first time — that's expected for an unsigned script.)
3. Fully quit After Effects if it's open, then reopen it.
4. Window > Extensions > MOTION FORGE

MANUAL METHOD (if you'd rather do it by hand, or the script doesn't run)
-------------------------------------------------------------------------
1. Copy this ENTIRE folder (the one containing CSXS, client, host, assets)
   into your CEP extensions folder:

   Windows: %APPDATA%\Adobe\CEP\extensions\
            (paste that into the File Explorer address bar)
   Mac:     ~/Library/Application Support/Adobe/CEP/extensions/
            (in Finder: Go > Go to Folder…, paste that path)

   If the "extensions" folder doesn't exist, create it.
   End result should look like:
   .../CEP/extensions/MOTION FORGE/CSXS/manifest.xml

2. Turn on debug mode so After Effects will load an unsigned extension:

   Windows — open Registry Editor and add, under
     HKEY_CURRENT_USER\Software\Adobe\CSXS.12
   a String value named PlayerDebugMode with data: 1
   (Also fine to add the same under CSXS.9 / CSXS.10 / CSXS.11 to cover
   other AE versions — the install script already does all of these.)

   Mac — open Terminal and run:
     defaults write com.adobe.CSXS.12 PlayerDebugMode 1

3. Fully quit and reopen After Effects, then: Window > Extensions > MOTION FORGE

REQUIREMENTS
------------
- After Effects 2022 (v22) or newer — this build uses CSXS 12.
- The bundled solo.aep preset pack targets AE 2021+.

TROUBLESHOOTING
----------------
- Panel doesn't show up in the Extensions menu: debug mode wasn't set for
  the CSXS version your AE install actually uses, or the folder isn't in
  the right place / is missing manifest.xml. Re-run the installer script.
- Panel shows but buttons say "Preview mode": you opened index.html directly
  in a browser instead of through After Effects — it only works as a panel.
- Effects/presets report "failed safely": your AE version is older than the
  effect requires, or nothing was selected — the message will say which.
