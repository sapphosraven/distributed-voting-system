import React, { useEffect } from "react";
import styled from "@emotion/styled";

const BackgroundContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -2;
  overflow: hidden;
  pointer-events: none;
`;

export default function DynamicBackground() {
  useEffect(() => {
    const container = document.getElementById("particles-container");
    if (!container) return;

    // Clear any existing particles
    container.innerHTML = "";

    // Create particles
    const particleCount = 15;
    const colors = [
      "rgba(128, 82, 176, 0.15)", // Purple
      "rgba(230, 126, 34, 0.12)", // Orange
      "rgba(100, 64, 138, 0.08)", // Dark purple
      "rgba(200, 109, 30, 0.07)", // Dark orange
    ];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");

      // Random attributes
      const size = Math.random() * 140 + 40;
      const posX = Math.random() * 100;
      const posY = Math.random() * 100;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const opacity = Math.random() * 0.12 + 0.03;
      const blur = Math.random() * 50 + 30;
      const animDuration = Math.random() * 90 + 30;
      const animDelay = Math.random() * -30;

      // Apply styles
      particle.style.position = "absolute";
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.borderRadius = "50%";
      particle.style.background = color;
      particle.style.opacity = opacity;
      particle.style.filter = `blur(${blur}px)`;
      particle.style.left = `${posX}vw`;
      particle.style.top = `${posY}vh`;
      particle.style.animation = `float ${animDuration}s ease-in-out infinite`;
      particle.style.animationDelay = `${animDelay}s`;
      particle.style.transform = "translate(-50%, -50%)";

      container.appendChild(particle);
    }

    // Add CSS animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes float {
        0%, 100% { transform: translate(-50%, -50%) translateY(0) scale(1); }
        50% { transform: translate(-50%, -50%) translateY(-20px) scale(1.05); }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return <BackgroundContainer id="particles-container" />;
}
