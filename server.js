
import express from "express";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import cors from "cors";

dotenv.config();

const app = express();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Allow requests from the frontend
app.use(
  cors({
    origin: [
      "http://127.0.0.1:5501",
      "http://localhost:5501",
    ],
  })
);

app.use(express.json({ limit: "100kb" }));

app.use(express.static("."));

app.post("/api/summarize", async (req, res) => {
  try {
    const { topic } = req.body;

    if (typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({
        error: "Please enter a topic or text.",
      });
    }

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",

     
messages: [
  {
    role: "system",
    content: `
You are StudyMate AI, a friendly study tutor.

Your goal is to help students understand and remember topics.

Explain everything in simple, accurate English.

Follow this format:

TOPIC
Write the topic name.

SIMPLE EXPLANATION
Explain the topic in easy English.
Use short paragraphs.
Explain difficult words simply.
Use an everyday analogy when helpful.

HOW IT WORKS
Explain the process in simple numbered steps.
Explain each step clearly.

REAL-LIFE EXAMPLE
Give one simple example that helps students
understand the topic.

IMPORTANT POINTS
Give 4 or 5 short points to remember.

QUICK QUIZ
Give 3 multiple-choice questions.
Provide 3 options for each question.
Show the correct answer.
Give a short explanation for each answer.

FORMATTING RULES:
Use plain text only.
Do not use Markdown.
Do not use asterisks.
Do not use hashtags.
Do not use Markdown tables.
Do not use unnecessary separators.
Use simple headings.
Keep paragraphs short.
Make the explanation neat and readable.
Avoid unnecessary details.
Do not invent facts.
`
  },
  {
    role: "user",
    content: `Explain and summarize this study topic:\n${topic
      .trim()
      .slice(0, 12000)}`,
  },
],


      temperature: 0.4,
      max_tokens: 800,
    });

    res.json({
      summary:
        completion.choices[0]?.message?.content || "",
    });
  } catch (error) {
    console.error("Groq API error:", error.message);

    res.status(500).json({
      error:
        "Could not generate the explanation. Please try again.",
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `StudyMate AI running at http://localhost:${PORT}`
  );
});
