const KEYWORDS = ["money", "save", "spending", "investment", "buy", "price", "work"];

export async function fetchAdvice() {
  const keyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
  try {
    const res = await fetch(`https://api.adviceslip.com/advice/search/${keyword}`, {
      cache: "no-cache",
    });
    const data = await res.json();
    
    if (data.slips && data.slips.length > 0) {
      // Pick a random one from the search results
      const randomIndex = Math.floor(Math.random() * data.slips.length);
      return data.slips[randomIndex].advice;
    }
    
    // Fallback if no search results
    return "The best way to save money is to not spend it.";
  } catch {
    return "Small daily savings lead to big financial freedom.";
  }
}
