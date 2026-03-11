import { useEffect, useRef, useState, useMemo } from "react";

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

const OrbitCarousel = ({ imageData }) => {
    const [screenW, setScreenW] = useState(window.innerWidth);
    const [zoomedImg, setZoomedImg] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const containerRef = useRef();
    const requestRef = useRef();
    const rotationRef = useRef(0);        // ← ref instead of state
    const tiltRef = useRef({ x: 0, y: 0 }); // ← ref instead of state
    const velocityRef = useRef(0);
    const isPausedRef = useRef(false);
    const isDraggingRef = useRef(false);
    const lastDragX = useRef(0);
    const lastTimestamp = useRef(0);
    const cardRefs = useRef([]);
    const innerRef = useRef();
    const zoomedRef = useRef(null);

    const total = imageData.length;

    useEffect(() => {
        const handleResize = () => setScreenW(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const handleKey = (e) => { if (e.key === "Escape") { setZoomedImg(null); zoomedRef.current = null; } };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, []);

    const isMobile = screenW < 600;
    const radiusX = isMobile ? 160 : 430;
    const radiusZ = isMobile ? 80 : 180;
    const cardSize = isMobile ? 130 : 240;

    // --- Core animation loop — pure DOM manipulation, zero React re-renders ---
    useEffect(() => {
        const animate = () => {
            if (!zoomedRef.current) {
                if (!isDraggingRef.current) {
                    velocityRef.current *= 0.95;
                    rotationRef.current += 0.06 + velocityRef.current;
                }

                const rotation = rotationRef.current;
                const tilt = tiltRef.current;

                // Update the inner container tilt directly
                if (innerRef.current) {
                    innerRef.current.style.transform =
                        `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`;
                }

                // Update each card directly via DOM
                cardRefs.current.forEach((card, index) => {
                    if (!card) return;
                    const angle = (index * (360 / total) + rotation) * (Math.PI / 180);
                    const x = Math.sin(angle) * radiusX;
                    const z = Math.cos(angle) * radiusZ;
                    const normalizedZ = (z + radiusZ) / (2 * radiusZ);
                    const scale = 0.5 + (Math.pow(normalizedZ, 6) * 0.8);
                    const opacity = 0.3 + (normalizedZ * 0.7);
                    const isFront = normalizedZ > 0.95;

                    card.style.transform = `translate3d(${x}px, 0, ${z}px) scale(${scale})`;
                    card.style.opacity = opacity;
                    card.style.zIndex = Math.round(normalizedZ * 100);
                    card.style.pointerEvents = normalizedZ > 0.6 ? "auto" : "none";
                    card.style.cursor = isFront ? "zoom-in" : "default";
                    card.style.boxShadow = isFront
                        ? "0 0 30px rgba(255,107,157,0.6), 0 0 60px rgba(255,107,157,0.2)"
                        : `0 ${10 * normalizedZ}px ${20 * normalizedZ}px rgba(0,0,0,0.5)`;
                    card.style.border = isFront
                        ? "2px solid rgba(255, 150, 180, 0.8)"
                        : `2px solid rgba(255,255,255,${0.1 + normalizedZ * 0.4})`;
                    card.dataset.front = isFront ? "true" : "false";
                });
            }
            requestRef.current = requestAnimationFrame(animate);
        };
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [total, radiusX, radiusZ, isMobile]); // stable deps, loop never restarts

    // --- Event Handlers ---
    const handleMouseMove = (e) => {
        if (isDraggingRef.current) return;
        const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
        const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
        tiltRef.current = { x: x * 15, y: -y * 10 };
    };

    const handleDragStart = (e) => {
        if (zoomedRef.current) return;
        isDraggingRef.current = true;
        isPausedRef.current = true;
        setIsDragging(true); // only for cursor style
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        lastDragX.current = clientX;
        lastTimestamp.current = performance.now();
        velocityRef.current = 0;
    };

    const handleDragMove = (e) => {
        if (!isDraggingRef.current || zoomedRef.current) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const now = performance.now();
        const dt = Math.max(now - lastTimestamp.current, 1);
        const delta = clientX - lastDragX.current;
        velocityRef.current = (delta / dt) * 3;
        rotationRef.current += delta * 0.3;
        lastDragX.current = clientX;
        lastTimestamp.current = now;
    };

    const handleDragEnd = () => {
        isDraggingRef.current = false;
        isPausedRef.current = false;
        setIsDragging(false); // only for cursor style
    };

    const handleCardClick = (e, img) => {
        // Only zoom if it wasn't a drag
        if (Math.abs(rotationRef.current - rotationRef.current) < 1) {
            const card = e.currentTarget;
            if (card.dataset.front === "true") {
                setZoomedImg(img);
                zoomedRef.current = img;
            }
        }
    };

    return (
        <>
            {zoomedImg && (
                <div
                    onClick={() => { setZoomedImg(null); zoomedRef.current = null; }}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 1000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                        background: "rgba(5, 0, 2, 0.92)",
                        backdropFilter: "blur(18px)",
                        WebkitBackdropFilter: "blur(18px)",
                        animation: "overlayIn 0.3s ease-out",
                        cursor: "zoom-out",
                    }}
                >
                    <img
                        src={zoomedImg}
                        alt="Zoomed memory"
                        style={{
                            maxWidth: "90vw",
                            maxHeight: "82vh",
                            borderRadius: "20px",
                            boxShadow: "0 0 60px rgba(255,107,157,0.35), 0 0 120px rgba(255,107,157,0.15)",
                            border: "1.5px solid rgba(255,179,204,0.25)",
                            animation: "zoomIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                            objectFit: "contain",
                        }}
                    />
                    <p style={{
                        marginTop: 20,
                        fontFamily: "'Great Vibes', cursive",
                        fontSize: "clamp(1.4rem, 4vw, 2rem)",
                        color: "rgba(255,179,204,0.7)",
                        animation: "fadeInUp 0.5s 0.2s ease-out both",
                        pointerEvents: "none",
                    }}>
                        tap anywhere to close ♡
                    </p>
                </div>
            )}

            <div
                ref={containerRef}
                onMouseMove={(e) => { handleMouseMove(e); handleDragMove(e); }}
                onMouseEnter={() => { isPausedRef.current = true; }}
                onMouseLeave={() => { isPausedRef.current = false; tiltRef.current = { x: 0, y: 0 }; handleDragEnd(); }}
                onMouseDown={handleDragStart}
                onMouseUp={handleDragEnd}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
                style={{
                    position: "relative",
                    width: "100%",
                    height: isMobile ? "250px" : "500px",
                    perspective: isMobile ? "800px" : "1400px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "visible",
                    cursor: isDragging ? "grabbing" : "grab",
                    userSelect: "none",
                    touchAction: "none", // ← prevents scroll fighting on mobile
                }}
            >
                <div
                    ref={innerRef}
                    style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        transformStyle: "preserve-3d",
                    }}
                >
                    {imageData.map((img, index) => (
                        <div
                            key={index}
                            ref={el => cardRefs.current[index] = el}
                            onClick={(e) => handleCardClick(e, img)}
                            style={{
                                position: "absolute",
                                left: "50%",
                                top: "50%",
                                width: cardSize,
                                height: cardSize,
                                marginLeft: -cardSize / 2,
                                marginTop: -cardSize / 2,
                                backgroundImage: `url(${img})`,
                                backgroundSize: "contain",
                                backgroundRepeat: "no-repeat",
                                backgroundColor: "rgba(10, 1, 5, 0.9)",
                                backgroundPosition: "center",
                                borderRadius: "20px",
                                willChange: "transform, opacity", // ← GPU layer hint
                            }}
                        />
                    ))}
                </div>
            </div>
        </>
    );
};

// --- Combine with your previous App structure ---
export default function Photobok() {
    return (
        <div style={{ minHeight: "100vh", position: "relative" }}>
            <style>{`
                        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
                        
                        body { background: #0a0105; margin: 0; color: #fff; font-family: 'Cormorant Garamond', serif; overflow-x: hidden; }
                        
                        .title {
                        font-family: 'Great Vibes', cursive;
                        font-size: clamp(3rem, 10vw, 5rem);
                        color: #ffb3cc;
                        text-align: center;
                        margin-top: 40px;
                        }
                        
                        @keyframes sparkle {
                            0%, 100% { opacity: 0; transform: scale(0); }
                            50% { opacity: 0.8; transform: scale(1.2); }
                        }
                        
                        .fade-in { animation: fadeIn 1.8s ease-out; }

                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(15px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        
                        @keyframes overlayIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        
                        @keyframes zoomIn {
                            from { opacity: 0; transform: scale(0.6); }
                            to { opacity: 1; transform: scale(1); }
                        }
                        
                        @keyframes fadeInUp {
                            from { opacity: 0; transform: translateY(10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }`}</style>

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

                <OrbitCarousel imageData={images} />

                <footer className="fade-in" style={{ textAlign: "center", marginBottom: 20 }}>
                    <p style={{ fontFamily: "'Great Vibes', cursive", fontSize: "clamp(1.8rem, 6vw, 2.5rem)", color: "#ffb3cc", margin: 0 }}>
                        With love always ♡
                    </p>
                </footer>
            </main>
        </div>
    );
}