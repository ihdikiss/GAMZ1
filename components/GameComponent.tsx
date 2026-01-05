
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGame } from '../game/config';

const GameComponent: React.FC = () => {
  const parentRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (parentRef.current && !gameInstance.current) {
      gameInstance.current = createGame(parentRef.current);
    }

    return () => {
      if (gameInstance.current) {
        gameInstance.current.destroy(true);
        gameInstance.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={parentRef} 
      className="w-full h-full"
    />
  );
};

export default GameComponent;
