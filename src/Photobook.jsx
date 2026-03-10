import { useEffect, useRef, useState, useMemo } from "react";

// --- Configuration ---
const imageModules = import.meta.glob('./images/*.{png,jpg,jpeg,webp}', { eager: true, as: 'url' });
const images = Object.values(imageModules);

// --- 1. Falling Hearts Background ---
const HeartRain = () => {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let animId;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener("resize", resize);

        const hearts = Array.from({ length: 28 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * -window.innerHeight,
            size: 10 + Math.random() * 20,
            speed: 0.6 + Math.random() * 1.2,
            opacity: 0.15 + Math.random() * 0.3,
            drift: (Math.random() - 0.5) * 0.5,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.01 + Math.random() * 0.02,
            hue: 330 + Math.random() * 30,
        }));

        const drawHeart = (x, y, size, opacity, hue) => {
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(x, y - size * 0.3, x - size * 0.5, y - size * 0.7, x - size * 0.5, y - size * 0.4);
            ctx.bezierCurveTo(x - size * 0.5, y - size * 0.8, x, y - size * 0.9, x, y - size * 0.6);
            ctx.bezierCurveTo(x, y - size * 0.9, x + size * 0.5, y - size * 0.8, x + size * 0.5, y - size * 0.4);
            ctx.bezierCurveTo(x + size * 0.5, y - size * 0.7, x, y - size * 0.3, x, y);
            ctx.fill();
            ctx.restore();
        };

        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            hearts.forEach(h => {
                h.wobble += h.wobbleSpeed;
                h.x += h.drift + Math.sin(h.wobble) * 0.4;
                h.y += h.speed;
                if (h.y > canvas.height + 40) { h.y = -40; h.x = Math.random() * canvas.width; }
                drawHeart(h.x, h.y, h.size, h.opacity, h.hue);
            });
            animId = requestAnimationFrame(tick);
        };
        tick();
        return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
    }, []);
    return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />;
};

// --- 2. Sparkle Animation (Shining) ---
const Sparkles = () => {
    const sparkles = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 5}s`,
        size: 3 + Math.random() * 5,
    })), []);

    return (
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1 }}>
            {sparkles.map((s) => (
                <div key={s.id} style={{
                    position: "absolute",
                    left: s.left,
                    top: s.top,
                    width: s.size,
                    height: s.size,
                    borderRadius: "50%",
                    background: "white",
                    boxShadow: "0 0 10px white",
                    opacity: 0,
                    animation: `sparkle 4s ${s.delay} infinite`,
                }} />
            ))}
        </div>
    );
};

// --- 3. The 3D Circular Photobook ---
const Photobook = ({ imageData }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isPaused, setIsPaused] = useState(false); // For pausing on hover
    const [screenW, setScreenW] = useState(window.innerWidth);
    const touchStartX = useRef(0);
    const total = imageData.length;

    // Autoscroll Logic
    useEffect(() => {
        if (isPaused) return; // Don't scroll if user is hovering

        const timer = setInterval(() => {
            setCurrentIdx(prev => (prev + 1) % total);
        }, 1900); // Change 1900 to 5000 for a slower rotation

        return () => clearInterval(timer);
    }, [currentIdx, isPaused, total]);

    // Resize and Geometry (Keeping your existing logic)
    useEffect(() => {
        const handleResize = () => setScreenW(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const isMobile = screenW < 600;
    const cardWidth = isMobile ? 190 : 320;
    const cardHeight = isMobile ? 280 : 450;
    const radius = useMemo(() => {
        return Math.round((cardWidth / 2) / Math.tan(Math.PI / total)) + (isMobile ? 10 : 40);
    }, [cardWidth, total, isMobile]);

    const next = () => setCurrentIdx(prev => (prev + 1) % total);
    const prev = () => setCurrentIdx(prev => (prev - 1 + total) % total);

    return (
        <div
            onMouseEnter={() => setIsPaused(true)}  // Pause on Desktop hover
            onMouseLeave={() => setIsPaused(false)} // Resume on Mouse leave
            onTouchStart={(e) => {
                setIsPaused(true); // Pause on Mobile touch
                touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
                setIsPaused(false); // Resume after swipe
                const diff = touchStartX.current - e.changedTouches[0].clientX;
                if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
            }}
            style={{
                position: "relative",
                width: "100%",
                height: cardHeight + (isMobile ? 120 : 180),
                perspective: "1500px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {/* The Rotating Stage */}
            <div style={{
                position: "relative",
                width: cardWidth,
                height: cardHeight,
                transformStyle: "preserve-3d",
                transition: "transform 1s cubic-bezier(0.25, 0.1, 0.25, 1)",
                transform: `translateZ(-${radius}px) rotateY(${-currentIdx * (360 / total)}deg)`,
            }}>
                {imageData.map((img, index) => {
                    const angle = index * (360 / total);
                    const isSelected = index === currentIdx;
                    return (
                        <div key={index} onClick={() => setCurrentIdx(index)} style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: "15px",
                            backgroundImage: `url(${img})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            border: "2px solid rgba(255,255,255,0.1)",
                            transform: `rotateY(${angle}deg) translateZ(${radius}px) ${isSelected ? 'scale(1.25)' : 'scale(1)'} `,
                            backfaceVisibility: "hidden",
                            filter: isSelected ? "brightness(1.1)" : "brightness(0.4)",
                            boxShadow: isSelected ? "0 0 35px rgba(255,107,157,0.4)" : "0 5px 15px rgba(0,0,0,0.5)",
                            transition: "all 0.6s ease",
                            cursor: "pointer"
                        }} />
                    );
                })}
            </div>

            {/* Nav dots/buttons remain same */}
            <div style={{ display: "flex", alignItems: "center", gap: 15, marginTop: isMobile ? 30 : 60, zIndex: 10 }}>
                <button onClick={prev} className="nav-btn">←</button>
                <div style={{ display: "flex", gap: 6 }}>
                    {imageData.map((_, i) => (
                        <div key={i} onClick={() => setCurrentIdx(i)} style={{
                            width: i === currentIdx ? 18 : 6,
                            height: 6,
                            borderRadius: 3,
                            background: i === currentIdx ? "#ff6b9d" : "rgba(255,107,157,0.3)",
                            cursor: "pointer",
                            transition: "0.3s"
                        }} />
                    ))}
                </div>
                <button onClick={next} className="nav-btn">→</button>
            </div>
        </div>
    );
};

// --- 4. Main Application ---
export default function App() {
    return (
        <div style={{ minHeight: "100vh", position: "relative" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Cormorant+Garamond:wght@400;600&display=swap');
                
                body { background: #0a0105; margin: 0; color: #fff; font-family: 'Cormorant Garamond', serif; overflow-x: hidden; }
                
                .nav-btn {
                    background: rgba(255,107,157,0.1);
                    border: 1px solid rgba(255,107,157,0.4);
                    color: #ffb3cc;
                    padding: 8px 18px;
                    border-radius: 20px;
                    cursor: pointer;
                    font-size: 1.1rem;
                    backdrop-filter: blur(4px);
                    transition: 0.3s;
                }
                .nav-btn:hover { background: rgba(255,107,157,0.3); color: #fff; }

                @keyframes sparkle {
                    0%, 100% { opacity: 0; transform: scale(0); }
                    50% { opacity: 0.8; transform: scale(1.2); }
                }
                
                .fade-in { animation: fadeIn 1.8s ease-out; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            <HeartRain />
            <Sparkles />

            {/* Background Gradient */}
            <div style={{ position: "fixed", inset: 0, background: "radial-gradient(circle at center, #1e0612 0%, #050002 100%)", zIndex: -1 }} />

            <main style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between", // Pushes footer down
                padding: "40px 20px"
            }}>
                <header className="fade-in" style={{ textAlign: "center" }}>
                    <h1 style={{
                        fontFamily: "'Great Vibes', cursive",
                        fontSize: "clamp(3rem, 12vw, 5.5rem)",
                        color: "#ffb3cc",
                        margin: 0,
                        textShadow: "0 0 15px rgba(255,107,157,0.3)"
                    }}>
                        Happy Birthday
                    </h1>
                    <p style={{ color: "rgba(255,179,204,0.6)", fontStyle: "italic", fontSize: "clamp(1rem, 4vw, 1.4rem)" }}>
                        A journey through our beautiful memories
                    </p>
                </header>

                <Photobook imageData={images} />

                <footer className="fade-in" style={{ textAlign: "center", marginBottom: 20 }}>
                    <p style={{ fontFamily: "'Great Vibes', cursive", fontSize: "clamp(1.8rem, 6vw, 2.5rem)", color: "#ffb3cc", margin: 0 }}>
                        With love always ♡
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.3)", marginTop: 5 }}>
                        {window.innerWidth < 600 ? "Swipe to rotate" : "Use arrows or click photos"}
                    </p>
                </footer>
            </main>
        </div>
    );
}