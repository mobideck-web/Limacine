# Playback integrations

Luma distinguishes an installed integration from verified playback. A loaded iframe, HTTP 200, or advertised source count is not evidence that a film plays.

All embedded sources retain `allow-scripts allow-same-origin allow-presentation`, with no popup or top-navigation permissions. No video is relayed through Netlify. Only FrameXTV currently participates in automatic selection; all other integrations remain selectable manually at the user’s request, with their last verified status shown. Manual availability does not mean playback succeeded. Automatic retries are capped at three different sources per session.

## Provider references

- FrameXTV: https://framextv.cc — existing protected playback and progress integration.
- VidSrc: https://vidsrc.sh — retained; protection compatibility is required.
- Vidly: https://vidly.pro — retained; protection compatibility is required.
- VidLink: https://vidlink.pro — movie/episode routes and validated PLAYER_EVENT messages; displays “Please Disable Sandbox” in the protected test.
- VidFast: https://vidfast.vc — protected test displays “Please Disable Sandbox”.
- CineSrc: https://cinesrc.st/docs — movie/episode integration, resume, bounded origin/source-checked progress messages. The Godfather played with real progress; Your Name reached a player but did not show verified progress during its test. Manual selection only; series coverage is not yet qualified. Native captions start off through the provider’s public `subtitles=off` URL option, so Luma’s timed captions cannot duplicate native English captions.
- PrimeSrc: https://primesrc.me — documented iframe integration; test returned a host link rather than verified video. Manual selection retained; playback is unverified.
- Embed.su: https://embed.su — retained as a candidate; homepage fetch failed and the embedded host failed DNS resolution. Manual selection retained; playback is unverified.
- AutoEmbed: https://autoembed.me — documented TMDB/IMDb formats; embedding was refused in testing. Manual selection retained; playback is unverified.

Provider domains can change. Domain changes must update the explicit origin allowlists; never accept wildcard message origins.

## Official YouTube collection

The curated manifest in `lib/youtube-library.json` contains 30 official uploads: 22 Arabic documentaries, seven clearly labeled animated shorts, and one complete Mosfilm feature. Public watch-page metadata returned OK and playableInEmbed:true for all 30 on 2026-10-24. Publisher channel IDs, exact durations and attribution URLs are recorded with each title. Multipart documentary fragments, trailers and production logs were excluded. The five original entries are preserved:

| Video | Publisher | Duration |
|---|---|---|
| TikTok: rise of the Chinese giant | Al Jazeera Documentary | 45:25 |
| Sakiet Sidi Youssef | Al Jazeera Documentary | 54:04 |
| Big Buck Bunny | Blender | 10:35 |
| Sintel | Blender | 14:48 |
| Tears of Steel | Blender | 12:14 |

These are a curated starting collection, not an unrestricted YouTube search API. YouTube controls, ads, attribution, region restrictions, and removal decisions remain with YouTube and its publishers. Arabic captions are requested using the official player API; unavailable tracks are not invented. The app does not download YouTube media. Local captions can use official API timing.

## GitHub tools reviewed

- https://github.com/DivineChile/vidsrc-scraper — Express/Chromium extraction server. Subtitle paths reference TMDB/OpenSubtitles credentials and an English language list. Not installed or deployed.
- https://github.com/cinepro-org/core — modular backend; documented TMDB key requirement, PolyForm Noncommercial license, and explicit public-hosting security caveat. Not installed or deployed.
- https://github.com/videojs/video.js — appropriate for a later custom direct-media viewer. The current theater UI wraps the existing native and embedded players; no replacement player library is installed.
- https://github.com/video-dev/hls.js — useful when adding supported direct HLS; current Archive playback uses MP4, so no unnecessary dependency was installed.
- https://github.com/Fribb/anime-lists — assessed for future anime ID/season mapping. Current release uses verified TMDB/IMDb identities through Cinemeta and never guesses MAL episode offsets; no dataset is vendored.

No extractor, browser security bypass, proxy rotation, or access-control bypass is included. No new account, API key, or separate scraping host is required by this release.

## Catalogs and compatibility

Archive and YouTube have separate navigation, category shelves, scoped search, and result pagination. Anime and Arabic cinema start with editorial collections enriched through Cinemeta. Arabic classification denotes Arabic audio, not subtitles alone. Wikimedia remains metadata-only for bilingual matching. NASA is excluded from new catalogs; existing saved/history keys remain readable and legacy NASA playback is unavailable.

`/api/sources` takes validated TMDB/IMDb identities plus type/season/episode and returns capability/reason information. `/api/media` accepts provider identifiers only, never arbitrary URLs. All query-dependent API responses retain `Netlify-Vary: query`.

## Latest protected-source retest

FrameXTV played The Godfather and Breaking Bad S1E1/S1E2. CineSrc played The Godfather with real progress and resume. VidSrc and Vidly explicitly refused sandboxed playback; VidLink and VidFast asked to disable the sandbox. PrimeSrc returned an external host link rather than playable video. Embed.su failed to load; AutoEmbed refused embedding. All nine remain manually selectable with protection unchanged, per the user’s latest instruction. Only FrameXTV enters automatic fallback. The native CineSrc module is disconnected and archived outside the app.

## Live YouTube channel library

The YouTube collection refreshes public metadata from the official DW Documentary Arabic, Al Jazeera Documentary, Mosfilm and Blender Studio channels. It checks recent full-length uploads and eligible complete shorts, validates publisher identity and embedding availability, and merges them with the original 30-title fallback catalog. This is an official-channel library, not unrestricted global YouTube search. Public-page formats can change; a failed refresh preserves the last catalog and shows a saved-library status. No API key, account, video download or video relay is used.

Refreshes run on library requests and every 30 minutes while browsing, with a one-minute manual-refresh cooldown, a shared in-flight request, a bounded 18-second refresh budget, four channel reads and at most twelve watch-page metadata checks. The catalog is capped at 180 titles while preserving the original 30. Caches are process-local and rebuild on a server restart. Playback remains YouTube’s official protected embed. Unknown saved video identities are revalidated against the publisher allowlist when resolving media.

The catalog/search response adds youtube.mode, updatedAt, nextRefreshAt and per-channel status; refresh=1 is supported for the YouTube provider. API responses preserve query variation and forced refresh responses are not cached by the CDN.
