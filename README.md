# Time Tracker

Time Tracker is a Windows CEP panel for Adobe After Effects. It records how
long each saved After Effects project is open while you are actively using
Windows. The panel is an early development build, so try it with copies of
projects and keep a backup of its data.

The extension manifest identifies the panel as `com.timetracker.panel`,
requires CEP 12, and currently targets After Effects (the `AEFT` host). It is
configured for After Effects 26.0.

## What is in this repository?

- `CSXS\manifest.xml` — Adobe CEP registration, host/runtime requirements, and
  panel entry points.
- `index.html`, `css\style.css`, and `js\main.js` — the panel interface,
  styling, status updates, and startup of the Windows helper.
- `js\CSInterface.js` — Adobe's CEP bridge used by the panel to communicate
  with After Effects. It must be present at this path.
- `jsx\host.jsx` — ExtendScript code running inside After Effects. It checks
  the open project and idle time, and saves project totals.
- `IdleHelper\` — a small .NET 8 Windows program that reads Windows idle time
  and writes it for the After Effects script to use.

## Install and open the panel in After Effects

1. Copy the complete `Time Tracker` folder into:

   `%APPDATA%\Adobe\CEP\extensions\Time Tracker`

   For this Windows account, `%APPDATA%` expands to
   `C:\Users\<your-user>\AppData\Roaming`. The folder must contain `CSXS`,
   `IdleHelper`, `css`, `js`, `jsx`, and `index.html` directly inside it.
   Do not copy only the README or the contents of an individual subfolder.

2. Confirm `js\CSInterface.js` exists. If it is missing, obtain it from Adobe's
   CEP Resources / CEP SDK and place it there. It is the bridge between the CEP
   panel and Adobe host applications.

3. Ensure the Windows helper exists at
   `IdleHelper\publish\AETT-IdleHelper.exe`. A prebuilt copy may be included.
   To build it yourself, install the .NET 8 SDK, open a terminal in
   `IdleHelper`, and run:

   ```powershell
   dotnet publish -c Release -r win-x64 --self-contained true -o publish
   ```

4. For an unsigned development extension, enable CEP debug mode. In Registry
   Editor, create or set the `DWORD (32-bit)` value `PlayerDebugMode` to `1`
   under:

   `HKEY_CURRENT_USER\Software\Adobe\CSXS.12`

   This extension declares CEP runtime 12. Restart After Effects after
   changing this setting. Only enable debug mode for extensions you trust.

5. In After Effects, enable **Allow Scripts to Write Files and Access Network**
   in **Edit > Preferences > Scripting & Expressions** if it is not already
   enabled. Restart After Effects if prompted.

6. Open a saved project, then open the panel from
   **Window > Extensions (Legacy) > Time Tracker**. The first time the panel is
   opened in an After Effects session, it starts tracking. The panel can then
   be closed; tracking continues in After Effects until the application exits.
   Open the panel again after restarting After Effects.

If Time Tracker does not appear in the menu, confirm the folder is in the CEP
extensions directory, `CSXS\manifest.xml` is present, and debug mode is set for
`CSXS.12`; then restart After Effects.

## Tracking behavior and limitations

- Time is counted only for a saved `.aep` project; unsaved projects do not yet
  have a stable file path to identify.
- The project may remain tracked while another application is in the
  foreground, as long as Windows idle time is below five minutes.
- Tracking pauses after five minutes without Windows input.
- The helper checks Windows idle time about once per second. After Effects
  checks the project and idle state every two seconds and saves totals every ten
  seconds.
- The panel displays tracked time as days:hours:minutes (`D:HH:MM`).
- The helper runs independently of the panel and exits when After Effects is
  no longer running.

## Data location

Project totals are stored in:

`<Windows Documents folder>\AE-TimeTracker\projects.json`

Totals are keyed by the lower-cased absolute project path. The helper's latest
idle reading is stored alongside the totals in `idle-seconds.txt`. Back up
`projects.json` before experimenting or manually editing it.
