# Free YouTube metadata updates

The feed is a small, curated list of recent uploads from four official public science and space channels. It is not YouTube's personalized recommendation feed and is not restricted to Shorts. Atom does not provide a reliable duration or Shorts classification; ordinary videos and live-stream announcements can appear.

## Sources and verification

On 2026-10-02, the official organization pages below were followed to their YouTube channels. Each channel ID was then checked against the linked YouTube page's canonical URL and `itemprop="identifier"`, and its official Atom feed was fetched and parsed successfully.

| Channel | Verified channel ID | Official organization source | Linked YouTube page |
| --- | --- | --- | --- |
| NASA | `UCLA_DiR1FfKNvjuUpBHmylQ` | [NASA social media directory](https://www.nasa.gov/social-media/) | [NASA](https://www.youtube.com/NASA) |
| JAXA | `UCfMIdADo6FQayQCOkLYGhrQ` | [JAXA media page](https://www.jaxa.jp/media_j.html) | [JAXA Channel](https://www.youtube.com/user/jaxachannel) |
| European Space Agency, ESA | `UCIBaDdAbGlFDeS33shmlD0A` | [ESA official channels](https://www.esa.int/ESA/Connect_with_us/Connect_with_us) | [ESA](https://www.youtube.com/esa) |
| NASA Jet Propulsion Laboratory | `UCryGec9PdUCLjpJW2mgCuLw` | [NASA social media directory](https://www.nasa.gov/social-media/) | [JPLnews](https://www.youtube.com/user/JPLnews) |

[YouTube's official documentation](https://developers.google.com/youtube/v3/guides/push_notifications) documents the channel Atom URL form. This project reads that feed directly during the build. It does not subscribe to a push hub, use an API key, sign in, scrape video media, or send visitor information to a feed proxy.

Video titles and links are source metadata, not a license to download or reupload video. Videos remain with their publishers and are played only using the existing consent-based official YouTube embed or an original-service link. Playback availability, age/region restrictions, and embedding permissions remain controlled by YouTube and each publisher. Game coins and other fictional rewards are independent of watching, liking, or sharing external videos.

## Build integration

After `npm ci --ignore-scripts`, run:

```sh
node scripts/update-youtube-feed.mjs
npm test
npm run check
npm run build
```

The updater uses Node.js 22+ and the already installed `jsdom` development dependency solely for XML parsing; it adds no browser-runtime dependency. The build must copy `public/` contents to `dist/`, so the JSON is served at `./data/youtube-videos.json`. Local development must likewise expose the public directory at the site root.

The intended GitHub Actions schedule is approximately every six hours, at an off-hour minute, plus normal deployments and manual workflow runs. It fetches metadata and publishes the built Pages artifact with the existing Pages deployment permissions. It must keep `contents: read`: no token with repository write access, autocommit, new account, secret, OAuth grant, or external paid service is needed. Use a standard `ubuntu-latest` runner and one-day Pages artifact retention.

[GitHub documents standard hosted runner use as free for public repositories and Pages](https://docs.github.com/en/billing/concepts/product-billing/github-actions). Artifact/cache storage still has account-level limits; this implementation adds one JSON file of roughly tens of kilobytes, not video files. Do not opt into larger paid runners or increase paid storage settings. Free-service policies can change.

[Scheduled workflows may be delayed, dropped under load, or disabled after 60 days without repository activity](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). The schedule is best effort, not real-time delivery. A repository owner can re-enable it from Actions if GitHub disables it. The UI should display the last successful update date and stale/failed states honestly.

## JSON version 1

- `version`: `1`
- `checkedAt`: UTC time of the most recent updater attempt
- `updatedAt`: UTC time of the latest successful channel fetch, or `null` if none. It is unchanged when every channel fails. It does not guarantee that every channel is current.
- `channels`: fixed verified channel records with `id`, `title`, canonical channel `url`, exact `feedUrl`, `status`, `lastSuccessAt`, and `error`
  - `ok`: this attempt fetched and parsed the channel, including a valid empty feed
  - `stale`: this attempt failed; retained videos from that channel are last-good data
  - `unavailable`: this attempt failed and there are no retained videos for that channel
  - `lastSuccessAt`: latest successful fetch for that channel, or `null`
  - `error`: `null` or one safe code: `http_error`, `network_error`, `timeout`, `invalid_feed`, `too_large`. Response bodies and internal exception messages are never published.
- `videos`: at most 30 unique records globally, sorted by descending `publishedAt`, then video ID for ties
  - `id`, `channelId`, `channelTitle`, `title`, `publishedAt`, `updatedAt`, canonical `https://www.youtube.com/watch?v=...` `url`
  - video-level `updatedAt` comes from the publisher's Atom entry, not our fetch time
  - no descriptions, thumbnails, media files, visitor data, viewing history, or analytics

Treat all metadata as untrusted text in the UI. Use `textContent` or the existing escaping function; never inject titles as HTML. YouTube is official link-out only, including manually added videos and immersive cards. Never create a YouTube iframe, thumbnail, Player API script, or other YouTube playback request, even if an old external-content consent flag is present. X alone retains its separate explicit embed consent. Browser code should validate the payload again, deduplicate it against manual entries, and leave the user's local manual queue intact.

## Failure handling and network boundary

The only network targets allowed by the updater are the four exact HTTPS YouTube Atom URLs and this project's fixed deployed fallback JSON: `https://109mei.github.io/creator-pocket/data/youtube-videos.json`. There is no input for arbitrary channel/feed URLs. All redirects are rejected. Each response is limited to 512 KiB while streaming, each attempt to 12 seconds, and each channel to two attempts. The deployed fallback is tried once; its expected first-deployment 404 is harmless.

Before updating, the bundled JSON and previously deployed JSON are independently parsed and revalidated. The freshest last-good data is chosen per channel. A failed channel retains its previous records and success timestamp; a successfully fetched snapshot replaces that channel, so videos no longer present in the feed are not accumulated forever. The global output remains bounded to 30 entries. If every feed fails, the build can still publish working game code with stale last-good metadata. If both fallbacks are unavailable or invalid, it publishes an honest empty/unavailable result rather than inventing videos.

XML is parsed without script execution or external resource loading. DTD and entity declarations are rejected before parsing. Invalid XML, unexpected namespaces, channel mismatches, malformed IDs, mismatched or foreign URLs, element markup inside title fields, invalid dates, and oversized content reject the channel snapshot. YouTube's feed-level channel ID currently omits the `UC` prefix; the parser accepts that documented-in-code observed form or the full ID, while checking each entry's full channel ID and the feed's canonical channel link. Standard XML escapes are decoded to plain text; titles are limited to 300 characters.

Writes use a temporary file followed by an atomic rename. Network/provider failures are reported in the output JSON and build log; filesystem/programming failures still fail the command.

## Tests

`node --test tests/youtube-feed.test.mjs` covers XML and channel validation, Shorts URL normalization, escaped titles, hostile URLs, byte limits, bounded retry/timeout behavior, per-channel fallback, total outages, canonical metadata output, deduplication, and the global item cap. Tests run offline with controlled HTTP responses. The initial seed was also generated from all four real official feeds, each returning 15 entries; only the newest 30 across those feeds are distributed.
