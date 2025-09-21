---
layout: post
title: "the latin alphabet privilege"
date: 2025-09-21
categories: ["thoughts", "rant"]
description: "why polish names get to keep their spellings but russian names don't"
feature_image: "/assets/img/article_imgs/names/cyrillic-transform.webp"
reading_time: 4
comments: true
---

I was recently reading the book _Breaking Through_ by Hungarian-American Biochemist Katalin Kariko (_a great book_). As it's a biography, Katalin naturally includes references to many Hungarian names throughout the book.

These names are all mentioned in their Hungarian spelling, which is often difficult to pronounce.

For example, one town that Katalin lived in is named `Kisújszállás`... take a moment to try to pronounce that.

Naturally, I struggled to pronounce it and skipped over it, but as it kept surfacing, I eventually had to look it up: `KEE-shoo-ee-shaah-lahsh`.

This pattern seemed off to me, so I delved deeper into why it exists. What I found was an obscure international standard that has quietly created a minor yet annoying issue for millions of people.

# The core issue

In English, we generally allow Latin-based languages to retain the native spelling of their names.

This feels like a violation of systems thinking and design.

If the whole goal of writing is to communicate an idea clearly, then including foreign non-English names inside English text breaks that.

My thesis:

> Just as we transliterate Russian names to their English equivalents, we should do the same for any foreign language, even if it uses a Latin script. This ensures **readers have a smooth, intuitive, and inclusive reading experience**.

# Deeper dive

You've probably noticed this before.

If you see a Bosnian name in an English setting, it will likely be spelled in Bosnian even though the letters would not be pronounced correctly by an English speaker. (In Bosnian, a `J` is pronounced closer to `y`, a `ć` is pronounced closer to `ch`, & more)

Most Latin languages face this issue, some with more severe differences than others:

- **Hungarian**
  - tends to be the most difficult for English speakers, I especially noticed this in Katalin's biography.
  - examples:
    - `Kisújszállás` - a city, pronounced `kee-SHOOY-sahl-lahsh`
    - `Zsuzsanna` - the Hungarian version of Suzanna, the name of Katalin's daughter.
- **Irish (Gaelic)**
  - If you have Irish friends, you have probably run into this
  - examples:
    - `Siobhán` - a common name, pronounced `shiv-AWN`
    - `Niamh` - another common name, pronounced `Neev`
- **Slavic languages** (Croatian, Bosnian, Slovenian, Czech, Slovak, Polish)
  - examples:
    - `Wojciech` - a common Polish name, pronounced `Voy-chek`
    - `Ljubljana` - the capital of Slovenia, pronounced `LYOOB-lyah-na`

# why it matters

1. **It disturbs reading flow**

When reading, my internal monologue gets derailed as I try to figure out how to say the name.

2. **It makes names difficult to retain**

If I can't pronounce it, I won't retain it.

3. **it spreads errors**

When someone learns a name in a mispronounced way, they will spread it in a mispronounced way.

# the bureaucratic root cause

At first, I assumed this was cultural pride. Just people insisting on keeping their native name spelling, and getting away with it because it resembles English. A sort of way to affirm identity.

It also felt like a weird Eurocentric double standard. _(Latin)_ European names get to retain their spellings, but non-European names have to be anglicized?

While those reasons might be partially true, as it turns out, they might not be the full picture.

The more likely reason for this pattern is **bureaucracy**.

## ICAO Document 9303 Part 7

**The International Civil Aviation Organization (ICAO)** is an agency which governs global aviation and standards.

As part of this role, it's also responsible for releasing standards governing how names appear on passports.

This is where [**Document 9303 Part 7 comes in**](https://www.icao.int/sites/default/files/publications/DocSeries/9303_p7_cons_en.pdf).

The main thing to know about this document is that it specifies that **Latin alphabet is mostly not transliterated** beyond the removal of diacritics and a few mandatory mappings.

Here's the list of mandatory transliterations:

- æ → AE
- œ → OE
- ß → SS
- þ → TH

As you can see, that list is not very comprehensive. And it definitely doesn't cover any of the issues we've mentioned above.

## cascading consequences

It seems that this one document's policy has cascaded everywhere. Passports drive identity, and every other system follows suit from there (passport -> visa -> immigration -> writing).

The result is the normalization of non-English names in English writing, even if they are not pronounceable in English.

This causes issues for readers, but I imagine it also causes headaches for millions of people affected by it as well.

For example, imagine you're born in Hungary with the name `Zsuzsanna`. You immigrate to Canada. Legally, you stay `Zsuzsanna`.

Essentially doomed to repeat "it's pronounced Suzanna" for the rest of your life (unless you go through the hassle of a legal name change).

This is at least just annoying, but at most design debt at the scale of millions.

# my proposal for a better way

Although it turns out this pattern is mandated by international standards, it still feels like a sort of design failure that can be fixed.

For example, ICAO could mandate that each language create a mapping table for English transliteration.

ICAO already does this for many non-Latin characters coming from languages like Russian, Chinese, etc., so this should easily be made to cover all languages

![ICAO Document 9303](/assets/img/article_imgs/names/transliteration-cyrillic.webp)

Although it's too late for the millions affected, I don't think it's too late to make a change for the future.

We should treat all foreign languages as foreign languages requiring transliteration by default.

It's just good design.

P.S. I'll send this article to ICAO and see if I hear back. Will keep you posted.
