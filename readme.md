## Dynamic Stats Overlay

A Noita mod that serves a small stats overlay — deaths, wins, current win
streak and personal best — over HTTP directly from the game process, meant to
be added to OBS as a browser source.

The overlay updates every 3 seconds (and immediately when you die), smoothly
fades out when the game isn't running, and comes back on its own when it is.
The page keeps working between game restarts, so the browser source can just
live in your scene forever and never needs refreshing.

### Usage

Install and enable the mod, start a new run — the overlay is actually running
only during a run, and first time setup needs it running.

In OBS, add a new Browser source and set the URL to `localhost:5435` (the port
is configurable in mod settings).

After seeing the overlay, you can close the game — note that the overlay will
fade out when the game isn't running, you can add a `#stats.stale { opacity: 1; }`
CSS rule temporarily to keep it visible while editing the CSS rules.

The overlay is plain HTML and completely restylable.

As an example, this is what I use (browser source width and height 400x400,
NoitaPixel font installed on my system):

```css
#stats {
    flex-direction: column;
    align-items: center;
    font-family: NoitaPixel;
    font-smooth: never;
    font-size: 72px;
    color: white;
    gap: 0.1rem;
}
#deaths { --label: "d:"; }
#wins { --label: "w:"; }
#streak { --label: "s:"; }
#record { --label: "pb:"; }
```

Some things you can do from CSS:

- Each stat is an element with id: `#deaths`, `#wins`, `#streak`,
  `#record`. The label text in front of each number is just the `--label`
  variable, so `#deaths { --label: "Deaths: "; }` can be used to change (or remove) it.
- Hide a stat you don't care about with `#wins { display: none; }`.
- `#stats` is a flex container, so `flex-direction`, `gap`, `align-items` etc.
  control the layout. (Copy this readme section into an LLM and ask it in
  English how you want your stats to look 🤷)
- When the game isn't running the container gets the `stale` class, which
  fades it out via `opacity` — override `#stats.stale` if you'd rather keep
  the last known numbers on screen.

If you want the raw data instead (for your own overlay, a bot, whatever), it's
a server-sent events stream at `http://localhost:5435/events` sending JSON
like `{"deaths":420,"wins":69,"streak":3,"record":7}`.

### Installation

The mod reads game memory directly and runs a native networking library
(pollnet) inside the game, which cannot be done without it "requesting unsafe
API permissions", so it cannot be uploaded to the Steam Workshop and you have
to install it manually from here.

Download the `dynamic-stats-overlay.zip` zip file from the
[releases](https://github.com/necauqua/dynamic-stats-overlay/releases) page and
unpack it into your `mods` folder.

The `mods` folder can be found next to the `noita.exe` file wherever the game
is installed on your system. If using Steam, you can right click on the game in
your library, select "Manage" -> "Browse local files" to open the game folder,
the `mods` folder should be there.

The zip file contains a single folder named `dynamic-stats-overlay`, and that
folder should be placed in your `mods` folder, after which the mod should appear
in your mod list in game.

### Building from source

Unlike most Noita mods, this mod is written in TypeScript and then transpiled
to Lua using the [Noita-TS](https://github.com/necauqua/noita-ts) project.

This adds a build step to it, so if you want to do it yourself, you can clone
this repo and run those commands:

```bash
npm install
npx nts build
```

This will create the `dist/dynamic-stats-overlay.zip` file.

If you have Noita installed through Steam, you can also run `npx nts run` to
have noita-ts create and launch an isolated Noita instance with a dev build
(includes debug features) of the mod installed, it's very convenient, and also
turbo-untested on Windows.

### License

This mod is licensed under the MIT license. See the LICENSE file for details.
