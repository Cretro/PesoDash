/**
 * DiceBear Avatar component
 * API: https://api.dicebear.com/9.x/adventurer/svg?seed={name}
 * No API key needed, generates unique avatars from a seed string.
 */
export default function Avatar({ name = "User", size = 40, style = {} }) {
  const seed = encodeURIComponent(name.trim() || "User");
  const src  = `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

  return (
    <img
      src={src}
      alt={`${name}'s avatar`}
      width={size}
      height={size}
      style={{
        borderRadius: "50%",
        flexShrink: 0,
        background: "rgba(99,102,241,.2)",
        ...style,
      }}
    />
  );
}
