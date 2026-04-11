import { motion } from 'framer-motion';

export const Confetti = () => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    const particles = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // vw
        y: -10 - Math.random() * 20, // vh
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        delay: Math.random() * 0.5,
        duration: Math.random() * 2 + 1.5
    }));

    return (
        <div className="fixed inset-0 pointer-events-none z-[160] overflow-hidden">
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-sm"
                    style={{
                        width: p.size,
                        height: p.size * 1.5,
                        backgroundColor: p.color,
                        left: `${p.x}vw`,
                        top: `${p.y}vh`
                    }}
                    animate={{
                        y: ['0vh', '120vh'],
                        x: [0, Math.sin(p.id) * 100],
                        rotate: [p.rotation, p.rotation + 360 * 3]
                    }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        ease: "easeOut"
                    }}
                />
            ))}
        </div>
    );
};
