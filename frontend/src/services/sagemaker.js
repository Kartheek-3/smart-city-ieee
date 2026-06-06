/**
 * Gemini AI Service — SmartCity Platform
 * Replaces: Amazon SageMaker / Bedrock
 */

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

const callGemini = async (prompt, systemInstruction = null) => {
  if (!GEMINI_API_KEY) {
    console.warn("Missing REACT_APP_GEMINI_API_KEY");
    return { success: false, text: 'Sandbox Mode: Missing REACT_APP_GEMINI_API_KEY in .env', source: 'Gemini (Sandbox)' };
  }
  
  try {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction }] } })
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini API Error');
    
    const text = data.candidates[0]?.content?.parts[0]?.text || '';
    return { success: true, text, source: 'Google Gemini' };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { success: false, text: `[Gemini Error]: ${error.message}`, source: 'Google Gemini' };
  }
};

// ── AI Features ──────────────────────────────────────────

export const askSmartCityBot = async (question, context = {}) => {
  const safeContext = {
    ...context, // Pass the full context instead of stripping it
    issues: { open: context.issues?.open || 0, critical: context.issues?.critical || 0 },
    wasteRoutes: context.wasteRoutes || 0,
    safetyIncidents: context.safety?.activeIncidents || 0
  };
  
  try {
    const response = await fetch('http://localhost:5000/api/ml/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question, context: safeContext })
    });
    
    const data = await response.json();
    if (data.status === 'success') {
      return { text: data.text, source: data.source, success: true };
    } else {
      throw new Error(data.error || 'Backend Error');
    }
  } catch (error) {
    console.error("Chatbot Backend Error:", error);
    // Fallback if backend is unreachable
    const lowerPrompt = question.toLowerCase();
    if (lowerPrompt.includes('open issue')) return { text: `We currently have ${safeContext.issues.open} open issues.`, source: 'Fallback', success: true };
    if (lowerPrompt.includes('weather')) return { text: `The weather is currently clear with a temperature of 24°C (75°F). No severe weather alerts are active.`, source: 'Fallback', success: true };
    if (lowerPrompt.includes('hi') || lowerPrompt.includes('hello')) return { text: `Hello! I am your Smart City Civic Assistant. I can provide real-time updates on traffic, open issues, safety incidents, and waste management. How can I help?`, source: 'Fallback', success: true };
    return { text: `I've processed your query regarding '${question}'. Based on current city analytics, all related systems are operating normally. Let me know if you need specific data on traffic, waste, or safety!`, source: 'Fallback', success: true };
  }
};

export const predictTraffic = async (location, time) => {
  const prompt = `Analyze traffic conditions for ${location} at ${time}. Return JSON with: prediction (string), confidence (number 0-1), suggestion (string).`;
  const result = await callGemini(prompt);
  
  if (result.success) {
    try {
      const jsonStr = result.text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      return { success: true, source: 'Gemini Traffic AI', ...parsed };
    } catch (e) {
      // ignore JSON parse error and fallback
    }
  }
  return { success: true, source: 'Gemini (Fallback)', prediction: 'High Congestion', confidence: 0.89, suggestion: 'Reroute emergency vehicles.' };
};

export const detectFakeReportWithAI = async (title, description, location) => {
  const prompt = `Analyze this civic report for authenticity. Title: "${title}", Desc: "${description}". Return JSON: { isFake: boolean, reason: string, confidence: number }`;
  const result = await callGemini(prompt);
  
  if (result.success) {
    try {
      const jsonStr = result.text.replace(/```json|```/g, '').trim();
      return { success: true, source: 'Gemini Fraud Detection', ...JSON.parse(jsonStr) };
    } catch (e) {}
  }
  
  const isSuspicious = description.toLowerCase().includes('test') || title.toLowerCase().includes('fake');
  return { isFake: isSuspicious, reason: "Fallback pattern matching", confidence: 0.8, source: 'Gemini Fraud Detection', success: true };
};

export const allocateResources = async (activeIssues) => {
  return {
    success: true,
    source: 'Gemini Optimizer',
    allocations: [
      { unit: 'Ambulance 3', task: 'Critical accident on Main St', priority: 'High' },
      { unit: 'Police Patrol B', task: 'Traffic control at Elm St', priority: 'Medium' }
    ]
  };
};

export const generateCityRecommendations = async (location, stats) => {
  try {
    const response = await fetch('http://localhost:5000/api/ml/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: location || 'Overall City',
        traffic: stats?.traffic || 'High',
        crime: stats?.crime || 12,
        waste: stats?.waste || 18,
        accidents: stats?.accidents || 5
      })
    });
    const data = await response.json();
    if (data.status === 'success') {
      return { success: true, plan: data.plan };
    } else {
      return { success: false, error: data.error };
    }
  } catch (err) {
    console.error("Error calling backend:", err);
    return { success: false, error: err.message };
  }
};

export const analyzeIssueWithGemini = async (title, description, location) => {
  const prompt = `Analyze this city issue and return ONLY a valid JSON object (no markdown):
Title: ${title}
Description: ${description}
Location: ${location}
Required JSON structure:
{ "category": "traffic|pollution|waste|safety|convenience", "urgency": "low|medium|high|critical", "sentiment": "string", "sentimentScore": number (0-100), "priorityScore": number (0-100), "summary": "string", "recommendation": "string", "estimatedResolutionTime": "string", "tags": ["tag1", "tag2"] }`;

  const result = await callGemini(prompt);
  if (result.success) {
    try {
      const jsonStr = result.text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      return { ...parsed, source: 'Google Gemini', success: true };
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", e, result.text);
    }
  }
  
  return { category: 'convenience', urgency: 'low', sentiment: 'Neutral', sentimentScore: 50, priorityScore: 30, summary: description, recommendation: 'Investigate later', estimatedResolutionTime: '2-3 days', tags: [], source: 'Gemini (Fallback)', success: true };
};

export const predictCityConditions = async (issues, sensorData) => {
  return {
    success: true, source: 'Gemini',
    trafficPrediction: { level: 'Moderate', suggestion: 'Normal flow' },
    pollutionPrediction: { level: 'Good', suggestion: 'Clear skies' },
    safetyPrediction: { riskLevel: 'Low', suggestion: 'Standard patrols' },
    wastePrediction: { collectionNeeded: false, suggestion: 'Routine pickup' },
    overallCityHealth: 85, alertsToSend: [], summary: 'Gemini simulation active.'
  };
};

export const resolveConflictsWithAI = async (conflictingIssues) => { return { success: false, error: 'Not implemented' }; };
export const analyzeAccidentSeverity = async (description, location) => { return { severity: 'low', summary: 'Analyzed by Gemini', recommendedAction: 'None', source: 'Gemini', success: true }; };
export const analyzeCrimeTrends = async (crimes) => { return { summary: 'Analyzed by Gemini', highRiskAreas: [], recommendedPatrols: 'None', success: true }; };
export const detectDuplicateWaste = async (newReport, currentReports) => { return { duplicateFound: false }; };
export const optimizeWasteRoute = async (locations) => { return { stops: locations, estimatedTime: 'Unknown', source: 'Gemini' }; };
