<h1 align="center">Extended Graph</h1>

<p align="center">Enhance the core graph plugin of <a href="https://obsidian.md/">Obsidian</a> with new features.</p>

This plugin enables you to:
- Add images to graph nodes.
- Easily filter by tags and properties.
- Remove links based on relationship types.
- Configure multiple views and switch between them seamlessly.

> [!IMPORTANT]
> This project is a work in progress. Before testing the plugin, please refer to the ![](#issues) to review potential bugs and risks..

![](doc/images/overview.webp)

# Installation

The plugin is available in beta through BRAT:
1. Install and enable the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) in your vault.
2. Navigate to `Settings > BRAT > Beta Plugin List > Add Beta Plugin`.
3. Enter `https://github.com/ElsaTam/obsidian-extended-graph` into the input field and select `Add Plugin`.

Have a look at the [wiki](https://github.com/ElsaTam/obsidian-extended-graph/wiki) for more info.

# Issues

I am currently seeking beta testers willing to try the plugin and report issues. Since the core graph plugin lacks an API and documentation, many features are experimental, and feedback is critical to identify and resolve bugs.

**Expected risks**:
- **Graph settings loss**: If the app does not close properly, graph settings could be lost. It *should* not happened, I haven't seen this bug in a long time, but I'm waiting for more testing before removing it from this list. If you want to be extra careful, make a copy of the file `.obsidian/graph.json` before enabling the plugin.

**Expected bugs**:
- **Search filter conflicts**: The way the core plugin handles the Search filter makes it hard to synchronize the graph properly. Depending on what was displayed when enabling the plugin and what the search filter changes, it might create some bugs. If this happens, best for now is to set up the search filter while the plugin is disabled and enable the plugin after.
- **Files modification issues**: The plugin might not synchronize correctly with changes made in your vault even if the core plugin handles them properly (such as renaming, deleting or moving a file).
- **Asynchronous errors**: Rapid interactions (e.g., toggling features, switching views, modifying filters) can result in data inconsistencies due to asynchronous processing. Resetting the plugin usually resolves the issue. If not, close and reopen the tab.

Please, if you encounter any bug, even if it is in the list above, report [an issue](https://github.com/ElsaTam/obsidian-extended-graph/issues).

# Supporting

The plugin is completely free to test and will always stay that way, and open source. If you'd like to support its development, you can make a donation via this link: https://github.com/sponsors/ElsaTam


## License

GNU General Public License version 3 (GPLv3) License