export async function fetchAdvice() {
  try {
    const res = await fetch("https://api.adviceslip.com/advice", {
      cache: "no-cache",
    });
    const data = await res.json();
    return data.slip.advice;
  } catch {
    return "Small daily savings lead to big financial freedom.";
  }
}
