# Luma Cinema on Netlify

Luma has a Netflix-inspired browsing experience: a cinematic feature, top navigation, horizontal genre shelves, continue-watching progress, hover actions and film-detail overlays. The home screen scrolls vertically; search and saved titles use a responsive grid with catalog pagination. Playback uses a matching theater layout with a large video canvas, a slim control bar, and settings drawers with scrolling content. Season and episode menus use dropdowns. Lists and watch history remain in the browser.

Search combines Cinemeta and Wikimedia metadata without accounts or API keys. Anime and Arabic Cinema have editorial collections enriched by IMDb identity. Internet Archive and official YouTube uploads have separate category browsing and scoped search. Archive MP4 files play directly from the provider; YouTube uses its official player API. Video is never relayed through Netlify. NASA is removed from new catalogs. Provider attribution is available in Details.

Every embedded player uses a sandbox without popup or parent-navigation permissions. VidSrc and Vidly are disabled because their supported playback is incompatible with this protection. FrameXTV starts muted for browser autoplay and uses its own playback and audio controls. Direct Archive videos also have Luma's play/pause controls. Source availability varies by title and provider.

Arabic subtitles reset to enabled for each title or episode. OpenSubtitles via Stremio is the primary no-account source, matched by IMDb ID and episode. The FrameXTV subtitle catalog is a fallback. Local SRT/VTT files stay in the browser. Missing Arabic tracks are reported explicitly; there is no automatic English substitution or machine translation.

Netlify uses the explicit Next.js adapter in netlify.toml for the API routes. API responses vary CDN cache entries by their full query strings. Subtitle requests validate identifiers, restrict downloads to known subtitle hosts, and bound file size and request time.

Design research included https://github.com/devandres-tech/Netflix-Clone (MIT, Andres Alcocer) and https://github.com/mrDanh11/Netflix. Luma's UI is implemented within the existing application; these projects are layout references, with no imported authentication, accounts, or API-key dependencies. Cinematic backdrops use IMDb-matched Metahub artwork with poster fallbacks.

Run `npm ci`, `npm run check` and `npm run build`. Deploy through the connected Netlify project `luma-cinema`. The local `.netlify/` linking state is ignored. No secrets are required by the current catalog adapters. Tests cover identity compatibility, bilingual ranking, fitted pagination, source protection, bounded failover, subtitle matching/timing, provider outages and download guards.

See [SOURCES.md](SOURCES.md) for provider qualification, official YouTube provenance, GitHub tools reviewed, and known limitations. The viewer matches the Netflix-inspired browsing style. The browser service is kept outside the Netlify deployment.

CineSrc uses a protected embed. The experimental native module is archived separately; see [CINESRC.md](CINESRC.md). Viewer menus use compact scrolling rows and labeled tabs. The YouTube collection contains 30 verified official uploads, including 22 Arabic documentaries, complete feature cinema and labeled animated shorts.

YouTube now refreshes approved publisher uploads automatically while the library is in use. The status row shows the last update and provides a manual refresh control. Search and filters include discovered uploads; the saved catalog stays available during upstream outages. No API keys are needed.
