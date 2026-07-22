"use client";

import { motion, Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.215, 0.61, 0.355, 1],
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export default function HomeHeader() {
  return (
    <motion.header
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mb-10 text-center md:text-left"
    >
      <motion.h1
        variants={itemVariants}
        className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-6xl mb-4"
      >
        Трускавець <span className="text-blue-600 dark:text-blue-400">2026</span>
      </motion.h1>

      <motion.p
        variants={itemVariants}
        className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed"
      >
        Найповніший путівник: від бюветів та парків до сучасних кав&apos;ярень та ресторанів. 
        Актуальні локації та чесні відгуки.
      </motion.p>
    </motion.header>
  );
}