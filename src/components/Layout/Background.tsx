import { motion } from 'framer-motion';
import './Background.css';

export const Background = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="background-container">
            {/* Ambient background glow */}
            <div className="ambient-glow">
                <div className="glow-orb primary" />
                <div className="glow-orb secondary" />
            </div>

            {/* Floating Particles */}
            <div className="particles-container">
                <motion.div
                    animate={{
                        y: [0, -20, 0],
                        opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="particle"
                    style={{ width: 8, height: 8, background: 'var(--primary)', top: '20%', left: '20%' }}
                />
                <motion.div
                    animate={{
                        y: [0, 30, 0],
                        opacity: [0.2, 0.5, 0.2]
                    }}
                    transition={{
                        duration: 7,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1
                    }}
                    className="particle"
                    style={{ width: 12, height: 12, background: 'var(--secondary)', top: '60%', right: '30%' }}
                />
                <motion.div
                    animate={{
                        x: [0, 40, 0],
                        opacity: [0.1, 0.4, 0.1]
                    }}
                    transition={{
                        duration: 9,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 2
                    }}
                    className="particle"
                    style={{ width: 6, height: 6, background: 'var(--accent)', bottom: '20%', left: '40%' }}
                />
            </div>

            {/* Main Content */}
            <div className="background-content">
                {children}
            </div>
        </div>
    );
};
