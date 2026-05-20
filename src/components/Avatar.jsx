/**
 * Avatar Component
 * 
 * Purpose: Dynamically renders user profile avatars without requiring database image hosting.
 * How it works:
 *  - Uses the **DiceBear API** (`https://api.dicebear.com/`).
 *  - Takes the user's `displayName` as a "seed".
 *  - DiceBear's server hashes the seed and generates a unique, consistent vector (SVG) illustration.
 *  - If the name is the same, the generated avatar is always the same.
 */
export default function Avatar({ name = "User", gender = "prefer_not_to_say", size = 40, style = {} }) {
  // encodeURIComponent guarantees characters like spaces do not break the URL request string
  const seed = encodeURIComponent(name.trim() || "User");
  
  const normGender = String(gender || "").toLowerCase();
  const baseBg = "backgroundColor=b6e3f4,dcfce7,fef3c7,ffdfbf";
  
  let src = "";
  if (normGender === "female") {
    // Filter for longer hairstyles and exclude mustache (facial hair) feature
    const longHairOptions = "long01,long02,long03,long04,long05,long06,long07,long08,long09,long10,long11,long12,long13,long14,long15,long16,long17,long18,long19,long20,long21,long22,long23,long24,long25,long26";
    src = `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&${baseBg}&hair=${longHairOptions}&features=blush,birthmark,freckles`;
  } else if (normGender === "male") {
    // Filter for short hair options, allowing hairProbability to include a bald variation
    const shortHairOptions = "short01,short02,short03,short04,short05,short06,short07,short08,short09,short10,short11,short12,short13,short14,short15,short16,short17,short18,short19";
    src = `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&${baseBg}&hair=${shortHairOptions}&hairProbability=85`;
  } else {
    // Random neutral avatars from DiceBear
    src = `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${seed}&${baseBg}`;
  }

  return (
    <img
      src={src}
      alt={`${name}'s avatar`}
      width={size}
      height={size}
      style={{
        borderRadius: "50%",
        flexShrink: 0, // Prevents flex layout from compressing the avatar shape
        background: "rgba(149,193,89,.2)",
        ...style, // Allows custom style overrides from parent elements
      }}
    />
  );
}
