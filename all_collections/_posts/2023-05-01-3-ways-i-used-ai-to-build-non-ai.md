---
layout: post
title: 3 ways I used AI to build a non-AI product
date: 2023-05-01
categories: ["ai", "colive values"]
description: Learn how I overcame the challenges of developing colive values, a platform for remote workers to find communities that align with their values and interests, by using cutting-edge AI tools and techniques.
feature_image: "/assets/img/article_imgs/openai_colivevalues.png"
feature_image_position: "95px -373px"
reading_time: 4
---
![colive values + openai](https://alsado.ca/assets/img/article_imgs/openai_colivevalues.png)

A couple months ago, the wave of AI/LLM breakthroughs took the world by storm and I found myself contemplating how to leverage these advances to my advantage.

Seeing the constant stream of GPT-powered products being released on Product Hunt every day, I considered jumping on the trend and trying my hand at building an exciting new AI-based tool.

But I didn't want to build something just for the sake of technology. I wanted to build something that would solve a real problem.

**Instead of focusing on building an AI product, I want to use AI to help me build a product.**

Enter colive values, an idea I had for a platform for remote workers to discover like-minded communities to temporarily work and stay in, that align with their values or interests. This was an idea I've contemplated for a while, but never had the time/resources to seriously look into.

#### Today I'd like to share 3 ways I used AI to help me overcome challenges and build colive values.

# 🧙‍♂️ #1 - Github Copilot, the Autocomplete wizard
First up is Github Copilot, a GPT-powered tool that integrates into your code editor and offers autocomplete as you type. 

## How I used it
Having Copilot on is like having a coding partner constantly working alongside me and pushing me along whenever I'm stumped. It analyzes my codebase and constantly provides helpful suggestions and completes my code.

Here it is in action, completing code according to a comment I wrote:
![Github Copilot in action](https://alsado.ca/assets/img/article_imgs/github-copilot.gif)

This helped me focus on the harder problems and to build fast.

## Lessons Learned
- Copilot's ability to take your codebase into context and suggest project-specific code is incredible.
- It works well ~80% of the time
- It's best used for monotonous coding tasks like writing boilerplates but falls apart pretty fast for debugging or refactoring.

# #2 👩🏻‍💻 ChatGPT, the trusted consultant
We're all familiar with ChatGPT, OpenAI's chat interface to its gpt-3.5 model.

## How I used it
ChatGPT was a valuable tool that helped me build colive values. It served as my consultant in everything from:
- researching the market, 🕵️
- bouncing ideas off of, 💡
- drafting user interview plans, 📝
- crafting or editing marketing messaging, 💬
- debating application architecture & best practices, 🔐
- creating one-off scripts to fix data issues, 📊
- debugging errors, 🐞
- and so much more.

## Lessons Learned
- ChatGPT is an excellent tool for getting a second opinion, brainstorming ideas, and providing guidance. But it's not perfect and gives low quality output if not prompted perfectly.
- It's best used when you carefully instruct it, walk through step by step, and provide as much context as possible along the way.

For example, when I made a mistake in my file structure, I needed ChatGPT to write a one-off script to fix it. 

Here's how I was able to carefully guide it to generate the exact script I needed

Initial prompt - Giving context and drawing out the problem
![ChatGPT initial prompt](https://alsado.ca/assets/img/article_imgs/chatgpt-initial-prompt.png)

Getting ChatGPT to regurgitate what I was asking for to validate and reinforce its understanding
![ChatGPT regurgitating](https://alsado.ca/assets/img/article_imgs/chatgpt-regurgitating.png)

Tada 🎉
![ChatGPT final script](https://alsado.ca/assets/img/article_imgs/chatgpt-final-answer.png)

# #3 ⚒️ GPT-4 API, the skilled worker
GPT-4 is the world's most advanced LLM yet, with powerful reasoning capabilities and a massive 1 trillion parameter model, 6x larger than its predecessor GPT-3.

## How I used it
During development, I was graciously given early access to the new GPT-4 API and all its power. 

So I put it to work on my most crucial task. 

Qualifying and classifying my dataset of 400+ communities.

The task wasn't simple. I needed to skim through each community in my database, understand its vibe, and match it against a list of defined values and interests which best fit it using reasoning and logic.

Before the drop of GPT, I would have just outsourced this task to a human. But now I had a new tool in my arsenal.

The process was a messy one, deep in the world of jupyter scripts, pandas dataframes, expensive GPT-4 API calls, and many json files named something like this `complete-data-v4-mar24-revised-fix-FINAL-processed.json`

But it worked.

Here's GPT-4 qualifying my dataset in action:
![GPT-4 in action](https://alsado.ca/assets/img/article_imgs/gpt4-in-action.png)

That took about a week where I:
- used prompt engineering to perfect my prompts
- testing the results on sample datasets
- & the final hurrah of running the full dataset through my pipeline

## Lessons Learned
- One lesson I learned quickly is that GPT-4 is **significantly** more expensive than GPT-3.5, about 20x more.

Can you guess which day I ran the full dataset?
![Expensive GPT-4 Calls](https://alsado.ca/assets/img/article_imgs/gpt4-billing.png)

- I also learned that it's still not perfect when not instructed carefully. I couldn't just throw my dataset at it and expect it to work well. I had to spend time engineering my prompts and testing the results.


# Wrapping it all up
Using AI tools like Github Copilot, ChatGPT, and GPT-4 were instrumental in helping me build colive values fast.

AI is no longer just a buzzword; it's a valuable tool that can help developers build better products faster. 

I'm launching colive values this week. If you're a remote worker seeking coliving communities that align with your values and interests, I encourage you to check it out. It might just have the home away from home you're looking for!

[Check out colive values](https://colivevalues.com)

[Follow me on twitter](https://twitter.com/themajd_)