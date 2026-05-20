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
export default function Avatar({ name = "User", size = 40, style = {} }) {
  // encodeURIComponent guarantees characters like spaces do not break the URL request string
  const seed = encodeURIComponent(name.trim() || "User");
  
  // Appends predefined soft pastel background colors for the generated avatar circle
  const src  = `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,dcfce7,fef3c7,ffdfbf`;

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
