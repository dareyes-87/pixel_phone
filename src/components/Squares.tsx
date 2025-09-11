import React, { useRef, useEffect } from "react";

type CanvasStrokeStyle = string | CanvasGradient | CanvasPattern;

interface GridOffset { x: number; y: number; }

interface SquaresProps {
  direction?: "diagonal" | "up" | "right" | "down" | "left";
  speed?: number;
  borderColor?: CanvasStrokeStyle;
  squareSize?: number;
  hoverFillColor?: CanvasStrokeStyle;
  /** NUEVO: ajustes de estilo para un look más “panel” */
  backgroundColor?: string;   // color base del lienzo
  gridOpacity?: number;       // opacidad de las líneas
  lineWidth?: number;         // grosor de líneas
  vignetteStrength?: number;  // 0–1 oscuridad de bordes
  centerGlow?: number;        // 0–0.15 brillo sutil en el centro
}

const Squares: React.FC<SquaresProps> = ({
  direction = "right",
  speed = 1,
  borderColor = "#ffffff",
  squareSize = 36,
  hoverFillColor = "#1b1b28",
  backgroundColor = "#0b0b13",
  gridOpacity = 0.15,
  lineWidth = 1,
  vignetteStrength = 0.8,
  centerGlow = 0.02,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const gridOffset = useRef<GridOffset>({ x: 0, y: 0 });
  const hoveredSquareRef = useRef<GridOffset | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const drawGrid = () => {
      const { width, height } = canvas;

      // Fondo base
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Cálculo de inicio de la grilla
      const startX = Math.floor(gridOffset.current.x / squareSize) * squareSize;
      const startY = Math.floor(gridOffset.current.y / squareSize) * squareSize;

      // Líneas de la grilla (sutiles)
      ctx.save();
      ctx.globalAlpha = gridOpacity;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = lineWidth;

      for (let x = startX; x < width + squareSize; x += squareSize) {
        for (let y = startY; y < height + squareSize; y += squareSize) {
          const squareX = x - (gridOffset.current.x % squareSize);
          const squareY = y - (gridOffset.current.y % squareSize);

          if (
            hoveredSquareRef.current &&
            Math.floor((x - startX) / squareSize) === hoveredSquareRef.current.x &&
            Math.floor((y - startY) / squareSize) === hoveredSquareRef.current.y
          ) {
            ctx.fillStyle = hoverFillColor;
            ctx.fillRect(squareX, squareY, squareSize, squareSize);
          }

          ctx.strokeRect(squareX, squareY, squareSize, squareSize);
        }
      }
      ctx.restore();

      // Viñeta + glow sutil (oscurece bordes, leve luz central)
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.sqrt(width * width + height * height) / 2;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gradient.addColorStop(0, `rgba(255,255,255,${Math.min(Math.max(centerGlow,0),0.15)})`);
      gradient.addColorStop(0.6, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(1, `rgba(0,0,0,${Math.min(Math.max(vignetteStrength,0),1)})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    };

    const updateAnimation = () => {
      const v = Math.max(speed, 0.1);
      switch (direction) {
        case "right":   gridOffset.current.x = (gridOffset.current.x - v + squareSize) % squareSize; break;
        case "left":    gridOffset.current.x = (gridOffset.current.x + v + squareSize) % squareSize; break;
        case "up":      gridOffset.current.y = (gridOffset.current.y + v + squareSize) % squareSize; break;
        case "down":    gridOffset.current.y = (gridOffset.current.y - v + squareSize) % squareSize; break;
        case "diagonal":
          gridOffset.current.x = (gridOffset.current.x - v + squareSize) % squareSize;
          gridOffset.current.y = (gridOffset.current.y - v + squareSize) % squareSize;
          break;
      }

      drawGrid();
      requestRef.current = requestAnimationFrame(updateAnimation);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const startX = Math.floor(gridOffset.current.x / squareSize) * squareSize;
      const startY = Math.floor(gridOffset.current.y / squareSize) * squareSize;

      const hoveredSquareX = Math.floor((mouseX + gridOffset.current.x - startX) / squareSize);
      const hoveredSquareY = Math.floor((mouseY + gridOffset.current.y - startY) / squareSize);

      if (
        !hoveredSquareRef.current ||
        hoveredSquareRef.current.x !== hoveredSquareX ||
        hoveredSquareRef.current.y !== hoveredSquareY
      ) {
        hoveredSquareRef.current = { x: hoveredSquareX, y: hoveredSquareY };
      }
    };

    const handleMouseLeave = () => (hoveredSquareRef.current = null);

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    requestRef.current = requestAnimationFrame(updateAnimation);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [direction, speed, borderColor, hoverFillColor, squareSize, backgroundColor, gridOpacity, lineWidth, vignetteStrength, centerGlow]);

  return <canvas ref={canvasRef} className="w-full h-full border-none block"></canvas>;
};

export default Squares;
