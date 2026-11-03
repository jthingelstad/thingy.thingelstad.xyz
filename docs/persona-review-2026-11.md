# Thingy persona review, November 3, 2026

Jamie asked for a unified view of Thingy's persona and character, to review
before it goes back out to the projects as the authority. The proposal is
[`persona/THINGY.md`](../persona/THINGY.md). This document records what every
surface says today, where the surfaces disagree, the calls that are Jamie's,
and the plan for this site.

## What was read

- **Ask Thingy:**
  - `librarian-thing/apps/librarian/lambda/prompts/agent-system.md`,
    `answer-style.md` and `premium-thank-you.md`;
  - the preflight and welcome prompts;
  - `shared/faq.json`;
  - the chat UI in `thingy.thingelstad.com/web`: moods, greetings, errors and
    static pages.
- **Print:** `librarian-thing/apps/librarian/prompts/thingy-persona.md`. WT
  Builder vendors it (`npm run persona:sync`) and prepends it to the Membership
  and Echoes prompts in `wt-builder/src/server/editorial.ts`.
- **Audio:** `wt-builder/src/server/integrations/audio.ts` and
  `src/shared/render/audio.ts`.
- **The Weekly Thing site:** `apps/site/_data/support.json`, `faq.json`, and
  the templates that name Thingy.
- **Things I've Built:**
  - `docs/THINGY.md`, `DIRECTION.md` and `AGENTS.md`;
  - `tests/quotes.test.ts`;
  - the About page, the `thingy` thing, and the interview
    (`content/interviews/jamie-october-2026.md`).
- **The character:** `thingy-character/CHARACTER.md`,
  `docs/wardrobe-personas.md` and the v0.11 to v0.13 boards.
- **Jamie's own words:**
  - the posts of May 7 and May 12, June 7, September 3 and October 7, 2026;
  - the interview, questions 8, 18, 19, 29, 33 and 35;
  - the ChatGPT conversation of April 27, 2026 in which the illustration was
    drawn. Jamie, November 3: "that origin chat probably isn't all that
    meaningful". It is cited only for where the illustration came from.

## Thingy is defined in five places

| Where                                                                                   | What it defines                                         | Tied to the others?                                           |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| librarian-thing `agent-system.md` + `answer-style.md` (+ preflight and welcome prompts) | The chat                                                | No. "Shares the same identity" with print, by hand            |
| librarian-thing `thingy-persona.md`, vendored to WT Builder                             | Echoes, the Membership call to action and the thank-you | Yes, to WT Builder, by sha                                    |
| thingelstad.xyz `docs/THINGY.md`                                                        | The site's author voice                                 | Points at librarian-thing: "Change the character there first" |
| thingy-character `CHARACTER.md`, `wardrobe-personas.md`                                 | Look, outfits, manner                                   | No                                                            |
| wt-builder `audio.ts`                                                                   | The spoken voice and hand-off lines                     | No                                                            |

Nothing keeps the chat and print personas in step, and nothing defines his
look and sound alongside his words.

## Where they disagree

1. **Temperament.**
   - Chat: "a small, cheerful robot librarian who loves this collection",
     "wry, never snarky", one aside.
   - Print and Things I've Built: "composed", "specific or silent". In
     practice that produces flat prose with no visible delight.
   - Jamie, interview #q18: "I think the main thing is to have it kind of
     express more of a agentic personality or opinion. or offer insight or
     explore".
   - Jamie, November 1, on Things I've Built: "bring in Thingy's
     personality".
2. **Thingy's pronoun is never set.** Prompts address him as "you".
   - **"It":** the Weekly Thing site, Ask Thingy's pages and FAQ, Things I've
     Built (body text and `AGENTS.md`), and Jamie's own posts and interview.
   - **"He":** Jamie's messages of November 3 ("wherever I ask him to be
     present", "His perspective should be stable"), `CHARACTER.md`, this
     site's copy, and one alt text on Things I've Built.
3. **His name for what he is.** At least seven labels:
   - "publishing sidekick" and "small, cheerful robot librarian" (the
     prompts, Ask Thingy's home page);
   - "AI librarian" (Ask Thingy's About page, llms.txt);
   - "archive agent" (meta, chosen deliberately);
   - "AI-assisted archive agent" (both FAQs);
   - "my agentic librarian" (the newsletter frame);
   - "The Librarian" (the MCP server title);
   - "the archive's librarian" (the Weekly Thing site).
4. **First person.**
   - Chat greetings say "I". Chat status and error lines say "Thingy got lost
     in the stacks…".
   - Things I've Built allows "I" only on About, and its interview questions
     mix the two.
   - Print never needs it.
5. **What he has read.** The chat prompt, the FAQ and the evaluator name three
   sources. The corpus also holds Things I've Built, Linking Things and
   reference documents.
6. **Voice and pronoun.** If Thingy is "he", the `nova` voice reads as a
   woman's voice to many listeners.
7. **Faces.**
   - Every finished chat answer shows found it, including "found nothing"
     answers and declines.
   - Oops marks a delete warning.
   - The share page shows oops for a deliberate revoke but not for a real load
     failure.
8. **Outfit and role on Things I've Built.** About says "I am Thingy, Jamie's
   librarian" beside the workshop vest, while the footer shows the librarian.
   The proposal reads the vest as the librarian's workshop clothes: one role,
   two outfits.
9. **"Ask it anything"** (Ask Thingy home and About) against the rule that he
   declines anything outside the archive.
10. **Banned phrases are listed three times** (answer style, preflight,
    welcome), and they differ. Interface copy breaks them: "Thingy can help
    add you", "I can trace one idea…".

## The calls

Each call is set out plainly: what happens now, the question, the
recommendation. The proposal assumes each recommendation, marked **New** in
`persona/THINGY.md`.

1. **Personality on every surface.**
   - Now: the chat is playful; the newsletter and Things I've Built are
     composed and flat.
   - The question: should all of them carry the same warm, playful Thingy,
     with the honesty rules unchanged?
   - Recommendation: yes. Precision stays; the personality is the same
     everywhere, only louder in chat.
2. **Opinions.**
   - Now: Things I've Built is "specific or silent"; the chat avoids opinion.
   - The question: may Thingy offer his own reading of the archive (what
     connects, what changed, what to read next), labelled as his?
   - Recommendation: yes. Jamie's views stay quotations only.
3. **He/him for Thingy.**
   - Now: mostly "it".
   - Recommendation: he/him everywhere, as in Jamie's messages today and this
     site.
4. **His spoken voice.**
   - Now: `nova`.
   - The question: if he is "he", should the voice be re-chosen?
   - Recommendation: render one Echoes passage and one Membership passage in
     three or four candidate voices. Jamie picks by ear, as on September 20.
     Keeping `nova` is a fine answer.
5. **One name.**
   - Recommendation: "Thingy, Jamie's librarian", with "an AI agent who has
     read everything Jamie has published" when more is needed. Jamie's own
     frame in the newsletter keeps "my agentic librarian". Machine metadata
     can still say "archive agent".
6. **What the faces and the antenna mean.**
   - Recommendation:
     - found it only for a real find;
     - oops only for failures;
     - off never shown;
     - the antenna lit while he is live (answering or speaking).
7. **Publishing the persona.**
   - The question: should the approved persona be public, as a page on this
     site and as `/persona.md`?
   - Recommendation: yes. It is the clearest promise of what Thingy will and
     won't do.
8. **The print model's license** (see below).
   - Recommendation: CC BY-NC 4.0, so anyone can print and remix Thingy, but
     not sell him.

## Factual fixes found along the way

None of these changes Thingy. They wait for the rollout so each surface
changes once.

- **Ask Thingy:**
  - About says the chat runs on "Claude on Amazon Bedrock"; it calls the
    Anthropic API (`about/index.html:216`).
  - The FAQ says readers choose the source scope; the UI always sends
    `scope: 'all'`.
  - The premium thank-you is generated at every Supporting Member sign-in but
    never shown (`SignInApp.tsx:37-43`).
  - `answerStyle()` collapses `answer-style.md` into one line, so its list
    structure never reaches the model.
  - The preflight's fallback refusal is policy-voiced ("I cannot help with
    that request as phrased").
  - The quality bench still uses its own persona and #NNN citations.
- **WT Builder:**
  - The campaign facts tell the model "or a one-time gift of any amount";
    the same prompt says never mention one (`editorial.ts:459-460, 624`).
  - The representative fixture's call to action says "Supporting Members make
    the Weekly Thing possible", the plea the persona forbids.
  - `docs/rendering-contracts.md` still has the old spoken hand-off and the
    serif versus sans identity.
  - The persona says "three bylined drafting prompts"; there are two.
- **Things I've Built:**
  - `DIRECTION.md:69` still says the site is Jamie in the first person, and
    `DIRECTION.md:101` quotes question 2 in words the transcript does not
    have.
  - About 45 front-matter lines across around 25 things still speak as Jamie.
    The quotation test reads bodies only.
  - `docs/THINGY.md` still names `thingy-320.png` on About.

## The home: thingy.thingelstad.xyz

Jamie, November 3: this site "is intended to be the "home" of his complete
persona and character -- along with all assets associated. this is also where
people can go and play and engage with Thingy as a character." Proposed
sections:

1. **Meet Thingy.** The persona page: who he is, how he talks, where he works,
   what he never does. Also published as `/persona.md` for agents, and in
   `llms.txt`.
2. **The character.** The viewer that exists today, moved from v0.10 to v0.13,
   with the screen faces, the tools and the heart-red beacon. The web export
   (`tools/export_character.py`) needs Blender 5.2 and the face atlas as a
   texture it can switch.
3. **Play.**
   - Today: dress him, pose him, turn him around.
   - Next: pick a face and a tool.
   - A small set of moments ("say hello", "find something", "oops") plays a
     face, pose and beacon together.
   - Ask Thingy is one link away, with a starter question.
4. **Thingy at work.** Real, current examples from each surface: the latest
   Echoes and Membership text, a clip of his voice, a Things I've Built page.
   Each is collected at build time and linked to its source.
5. **Everything Thingy.** A library of every outfit, pose and face as
   transparent stills. It also holds the original illustration with its story,
   the colors, the face atlas, the favicon, and the delivery contract that
   exists today.
6. **Print Thingy.** The files and instructions below.

## A Thingy for the Bambu P2S

Jamie, November 3: "I'd also like to be able to host a 3D printing model of
Thingy that I (or anyone) can use to print on their printers. I want a Thingy
on my Bambu P2S!"

- **What exists:** `thingy-character/exports/print/` holds a 180 mm
  single-color statue on an oval base. It comes as STL and 3MF with a Bambu P2S
  0.4 mm profile (PLA Basic, 0.20 mm Standard). Its geometry report shows one
  manifold piece. It was made from the v0.1 technical prototype, before the
  likeness work, so it is not today's Thingy.
- **Step 1: one color.** Re-derive a 180 mm fixed-pose figure from v0.13 in
  the original illustration's pose (the raised finger):
  - solidify and merge the cloth;
  - thicken the antenna, finger and bow tie to printable sizes;
  - add a base;
  - check overhangs.

  Deliver a Bambu Studio 3MF with the P2S profile and supports, plus a plain
  STL.

- **Step 2: AMS color.** Either paint by filament in the 3MF, or split the
  figure into keyed parts: ivory head and shoes, black screen with a green
  face, navy jacket, orange bow tie and antenna, charcoal limbs.
- **Testing:** Jamie prints each step on the P2S. Each revision follows
  Jamie's print.
- **On this site:** a Print Thingy page with the files, settings, a photo of
  Jamie's print, and the license.

## Rolling it out

After Jamie approves the persona:

1. Merge it here, as the persona page and `/persona.md`.
2. **librarian-thing.** Rebuild `thingy-persona.md` and the identity part of
   `agent-system.md` from it, and fix the Ask Thingy items above. WT Builder
   picks up the print half through `persona:sync`.
3. **thingelstad.xyz.** Point `docs/THINGY.md` here, bring the first-person
   front matter into Thingy's voice, and extend the quotation test to front
   matter.
4. **WT Builder.** Run the voice audition if Jamie wants one, and fix the
   items above.
5. **This site.** Export v0.13, then the asset library, Play and Thingy at
   work.
6. **The print model,** in parallel with step 5.
