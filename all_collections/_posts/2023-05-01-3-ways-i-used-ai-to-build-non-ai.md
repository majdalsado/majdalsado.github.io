---
layout: post
title: 3 ways I used AI to build a non-AI product
date: 2023-05-01
categories: ["ai", "colive values"]
description: Learn about the impact of language models on plagiarism in academia and explore the arguments for and against the use of LLMs in the writing process.
---
For the past few months, it feels like every hour someone is releasing a new GPT-powered product that will change the world.

When I was impacted by a large layoff last month, I had a decision to make. **What do I build?**

I could jump on this trend cycle and try my hand at building an exciting new AI tool. 

But I didn't want to build something just for the sake of technology. I wanted to build something that would solve a real problem.

Instead of focusing on building an AI product, I wanted to instead use AI to help me build a product.

That product is colive values, a platform for modern remote workers to find communities to stay in that align with their values and interests. A project I've been interested in for a while, but never had the time to actually build.

### Here are 3 ways I used AI to develop it.

# 🧙‍♂️ 1 - Github Copilot, the Autocomplete wizard
First up is Github Copilot, a GPT-powered tool that integrates into your code editor and offers autocomplete as you type. 

## How I used it
Copilot is like having a personal assistant that helps me write code faster and with more accuracy. It analyzes my codebase and constantly provides helpful suggestions and completing my code.

Here it is in action:
![Github Copilot in action](https://alsado.ca/assets/img/article_imgs/github-copilot.gif)

It was like having a coding buddy that could anticipate what I was thinking and offer suggestions. This feature helped me build colive values faster and with fewer errors.

## Lessons Learned
- Copilot's ability to take your codebase into context and suggest project-specific code is incredible.
- It works well ~80% of the time
- It's best used for monotonous tasks like writing boilerplate code, but falls apart for debugging or refactoring.

# 👩🏻‍💻 ChatGPT, the trusted consultant
You know ChatGPT. OpenAI's chat-interface to it's gpt-3.5 model. It's the one that's been making the rounds everywhere.

## How I used it
ChatGPT was a valuable tool that helped me build colive values. It served as my consultant in everything from:
- researching the market, 🕵️
- bouncing off ideas, 💡
- drafting user interview plans, 📝
- crafting or editing marketing messaging, 💬
- debating application architecture & best practices, 🔐
- creating one-off scripts to fix data issues, 📊
- debugging errors, 🐞
- and so much more.

## Lessons Learned
- ChatGPT is an excellent tool for getting a second opinion, brainstorming ideas, and providing guidance. But it's not perfect.
- It's best used when you carefully instruct it and provide it with context.

For example, when I made a mistake in my file structure, I needed ChatGPT to write a one-off script to fix it. 

Here's how I was able to carefully guide it to generate the exact script I needed

Initial prompt
![ChatGPT initial prompt](https://alsado.ca/assets/img/article_imgs/chatgpt-initial-prompt.png)

Getting ChatGPT to regurgitate what I was asking for to validate and reinforce its understanding
![ChatGPT regurgitating](https://alsado.ca/assets/img/article_imgs/chatgpt-regurgitating.png)

Tada 🎉
![ChatGPT final script](https://alsado.ca/assets/img/article_imgs/chatgpt-final-answer.png)

# ⚒️ GPT-4 API, the skilled worker
GPT-4 is the world's most advanced LLM yet, with powerful reasoning capabilities and a massive 13 billion parameter model.

## How I used it
During development, I was graciously given early access to the new GPT-4 API and all its power. So I put it to work on my most crucial task. 

Qualifying and classifying my dataset of 400+ communities.

The task wasn't simple. I needed to something to skim through each community in my database, understand the community's vibe, and match those against a list of defined values and interests using reasoning and logic.

Before the drop of GPT I would have just outsourced this task to a freelancer on Upwork. But now I had a new tool in my arsenal.

The process was a messy one spent deep in the world of jupyter scripting, pandas dataframes, json files, expensive GPT-4 API calls, and some hair pulling. 

But it worked.

Here's GPT-4 qualifying my dataset in action:
![GPT-4 in action](https://alsado.ca/assets/img/article_imgs/gpt4-in-action.png)

That took about a week was spent:
- prompt engineering to perfect my prompts
- testing the results on sample datasets
- & the final hurrah of running the full dataset

## Lessons Learned
- One lesson I learned quickly is that GPT-4 is **significantly** more expensive than GPT-3.5, about 20x more.
Guess which day I ran the full dataset?
![Expensive GPT-4 Calls](https://alsado.ca/assets/img/article_imgs/gpt4-billing.png)
- I also learned that it's still not perfect when not instructed carefully. I couldn't just throw my dataset at it and expect it to work well. I had to spend time engineering my prompts and testing the results.


# Wrapping it all up
Using AI tools like Github Copilot, ChatGPT, and GPT-4 was instrumental in building colive values. 

These tools helped me speed up development time, reduce errors, and focus on other aspects of development. 

AI is no longer just a buzzword; it's a valuable tool that can help developers build better products faster. 

I'm launching colive values this week. If you're a remote worker seeking coliving communities that align with your values and interests, I encourage you to check it out. It might just have the home away from home you're looking for!

[Check out colive values](https://colivevalues.com)

[Follow me on twitter](https://twitter.com/themajd_)