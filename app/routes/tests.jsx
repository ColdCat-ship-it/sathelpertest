// Frontend foundation for SAT AI Tool
import { useState } from "react";

export default function SATApp() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [aiFeedback, setAIFeedback] = useState(null);

  const questions = [
    {
      question: "Which choice best summarizes the main point of the passage?",
      options: [
        "A. The author argues for a return to traditional values.",
        "B. The passage outlines the benefits of technological progress.",
        "C. The author critiques the overuse of digital media.",
        "D. The passage narrates a personal experience in nature."
      ],
      correctAnswer: "C"
    }
  ];

  const handleSubmit = async () => {
    setSubmitted(true);

    // Send to backend for AI feedback
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: questions[currentQuestion].question,
        options: questions[currentQuestion].options,
        correctAnswer: questions[currentQuestion].correctAnswer,
        studentAnswer: selectedOption
      })
    });

    const data = await response.json();
    setAIFeedback(data.feedback);
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-4 shadow-xl rounded-2xl border">
      <h1 className="text-2xl font-bold mb-4">SAT Practice</h1>
      <p className="mb-4">{questions[currentQuestion].question}</p>
      <ul className="space-y-2">
        {questions[currentQuestion].options.map((option, index) => (
          <li key={index}>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="option"
                value={String.fromCharCode(65 + index)}
                disabled={submitted}
                onChange={() => setSelectedOption(String.fromCharCode(65 + index))}
              />
              <span>{option}</span>
            </label>
          </li>
        ))}
      </ul>
      <button
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        onClick={handleSubmit}
        disabled={!selectedOption || submitted}
      >
        Submit
      </button>

      {aiFeedback && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h2 className="font-semibold mb-2">AI Feedback:</h2>
          <p>{aiFeedback}</p>
        </div>
      )}
    </div>
  );
}
