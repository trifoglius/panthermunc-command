import confetti from "canvas-confetti";

export function firePassingVoteConfetti() {
  const duration = 2000;
  const end = Date.now() + duration;
  const colors = ["#7c3aed", "#a855f7", "#22c55e", "#eab308", "#ffffff"];

  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  confetti({
    particleCount: 80,
    spread: 90,
    origin: { y: 0.6 },
    colors,
  });
  frame();
}
