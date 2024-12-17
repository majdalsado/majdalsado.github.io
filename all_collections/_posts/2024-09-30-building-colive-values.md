---
layout: post
title: i built an Airbnb as a solo developer, here are 3 lessons I learned
date: 2024-07-20
categories: ["coliving", "remote work", "personal growth"]
description: What I Learned Building colive values from Scratch as a Solo Developer
feature_image: "/assets/img/article_imgs/colive-values-banner.png"
feature_image_position: "0"
reading_time: 3
---

![colive values](/assets/img/article_imgs/colive-values.png)
### preface: where the idea came from

When I first started thinking about [colive values](https://colivevalues.com), I wasn’t looking for a simple side project to tinker with. This was my first project with quite an ambitious goal: 
> To create a new way for remote workers to find like-minded coliving communities

—a platform that highlights community values, shared intentions, and authentic culture.

The idea *seemed* fairly simple at the time: build a platform to search and book coliving communities...

As it turns out, this was more complex than I could have imagined. The realization of how big of an undertaking this was became clear as I started drawing up the first data models and their relationships. 

> I remember slowly realizing  I was essentially rebuilding an Airbnb, as a solo developer.

What followed was an intense journey of learning and building everything from the ground up. 

Since then I've come fairly far and learned quite a lot along the way. 

Here are the three biggest lessons I've learned so far:

### 1. Narrow the Scope, Then Narrow It Some More

I set out with the goal of competing with companies that had been in the game for over a decade. Looking back, that was probably my first mistake. The sheer amount of work required to build anything competitive, let alone a marketplace which came with its own challenges, was likely too ambitious for a self-funded solopreneur.

At first it was straightforward: design a system with community listings and self-serve functionality for both Users and Hosts. Fair. 

Of course, search functionality is also critical—map views, complex filters, sorting algorithms, and a sleek UI were table stakes. Difficult, but still doable.

Then came payments. A robust payment system is essential if I want to make any money. But as great as Stripe is, it still comes with its own set of complexities: webhooks, payment intents, invoices, and checkout flows. And when you're handling people's money there is no room for mistakes.

Building a user-friendly app isn’t just about getting the core functionality right. Every small detail in the UI/UX matters. One misstep—a button that doesn’t work as expected, a confusing flow—and it ruins the entire experience. Users have very little patience these days, they expect things to come easy.

The list of "essential" features kept growing. Every time I crossed off a new feature, three more would pop up that would "really complete the experience". 

This is why making every effort to narrow your scope, especially in the beginning the scope isn’t just important—it’s essential. 

> Looking back I should have stopped to **re-evaluate what's needed to accomplish my mission**, not my ever expanding idea of the solution.

i.e. What's needed to (help remote workers find like-minded communities)<- Mission, not (to build a full platform to find and book coliving communities) <- Ever-expanding idea.

My takeaway? Minimize the number of features, but maximize the depth of each one. It’s better to do fewer things well than to attempt everything and deliver a half-baked product. 

### 2. Building Trust Is Harder Than Coding

Here’s the truth: building something that works is relatively easy. Getting people to trust and use it? Tough.

As a new product, you have a lot to prove. 

> Your users need to find you so much better than the competition that they're willing to leave the familiarity of established platforms just to work with you.

What may have been the most frustrating part of colive values was something that happened fairly often. After a user has submitted a booking request to stay at a community, the host would not respond! It felt like a punch to the gut to have a user make it through all the hoops of registration, discovery, meddling around, and finally go through with a booking, only for the Host to go completely silent...

The main reason for this was because I didn't develop a strong enough connection with each host when they joined. I hoped they'd be just as excited about a booking request as I was. But they hardly knew if they could even trust this lead.

The solution I found was keeping things very personal and over-explaining everything. Sending a video to a host explaining the process became a normal occurrence. 

Lesson learned: Introduce yourself well, and stay connected to your users. Also be very clear. If users have to ask, “How does this work?” then you’ve already lost them.

### 3. Market Really, Really Hard

If I could sum up self-funded marketing in one word: *grind*. Once you've built the app, you need people to care about it. That’s the real challenge. Without a pile of venture capital to throw at ads or partnerships, you have to rely on old-school, guerilla tactics. 

Reddit threads, Twitter posts, niche forums— these become your lifeline for spreading the word.

here's the catch: manual marketing like that never stops. It’s relentless. You can’t just post once and expect people to flood in. You have to keep going until you reach critical mass, and only then might it start to spread organically - if you're lucky.

The reality is, as a self-funded solo developer, marketing becomes a full-time job on top of building your product.

---

### Final Thoughts

Building colive values taught me a lot, but the most important lesson was probably this: as a solo developer, you’re not just writing code. You’re wearing every hat—developer, designer, marketer, and customer support. It’s overwhelming, but it’s also incredibly rewarding when you see people start to use and appreciate what you’ve built.

So, what’s next for colive values?

I can't keep running/building colive values as it stands.

Going forward, I'll be focused on narrowing the scope while staying true to its mission. 

One thing is clear: it’s not about doing it all. It’s about doing what matters—and doing it right.