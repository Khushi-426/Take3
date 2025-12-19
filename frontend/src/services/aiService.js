// services/aiService.js
/**
 * Simplified AI Commentary Service
 * Handles communication with backend AI coach
 */

const API_URL = "http://127.0.0.1:5001";

/**
 * Fetches AI commentary based on workout context and user query
 * @param {Object} context - Workout context (exercise, reps, feedback)
 * @param {String} query - User's voice query
 * @returns {Promise<String>} - AI response
 */
export const fetchAICommentary = async (context, query) => {
  try {
    const response = await fetch(`${API_URL}/api/ai_coach`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context: {
          email: context.email,
          exercise: context.exercise,
          reps: context.reps || 0,
          right_reps: context.right_reps || 0,
          left_reps: context.left_reps || 0,
          feedback: context.feedback || "",
        },
        query: query,
        history: [], // Can be expanded for conversation history
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response || "I'm here to help!";
  } catch (error) {
    console.error("AI Coach Error:", error);

    // Fallback responses
    const fallbacks = {
      how: "You're doing great! Keep focusing on your form.",
      reps: `You've completed ${context.reps} reps so far. Keep it up!`,
      stop: "ACTION: STOP",
      tired:
        "You're doing amazing! Take a deep breath and give me 3 more perfect reps.",
      form: "Your form is looking good. Remember to control the movement.",
    };

    // Find matching fallback
    const queryLower = query.toLowerCase();
    for (const [key, response] of Object.entries(fallbacks)) {
      if (queryLower.includes(key)) {
        return response;
      }
    }

    return "I'm having trouble connecting. Keep up the great work!";
  }
};

/**
 * Simple queries that don't need AI processing
 */
export const handleSimpleQuery = (query, context) => {
  const q = query.toLowerCase();

  if (q.includes("rep") || q.includes("count")) {
    return {
      needsAI: false,
      response: `You've completed ${context.reps} total reps. Right: ${context.right_reps}, Left: ${context.left_reps}`,
    };
  }

  if (q.includes("stop") || q.includes("quit") || q.includes("end")) {
    return {
      needsAI: false,
      response: "ACTION: STOP",
    };
  }

  return {
    needsAI: true,
    response: null,
  };
};
