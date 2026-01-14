
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGame } from '../game/config';

interface Props {
  questionData?: any;
  levelIndex?: number;
}

const GameComponent: React.FC<Props> = ({ questionData, levelIndex }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (parentRef.current && !gameInstance.current) {
      gameInstance.current = createGame(parentRef.current);
    }
    
    if (gameInstance.current && questionData) {
      // إرسال البيانات للمشهد النشط
      const scene = gameInstance.current.scene.getScene('MazeScene') as any;
      if (scene && scene.updateQuestion) {
        scene.updateQuestion(questionData, levelIndex);
      }
    }

    return () => {
      if (gameInstance.current) {
        gameInstance.current.destroy(true);
        gameInstance.current = null;
      }
    };
  }, [questionData, levelIndex]);

  return <div ref={parentRef} className="w-full h-full" />;
};

export default GameComponent;
