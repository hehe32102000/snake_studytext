/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Point, Direction, GameStatus } from '../types';
import { Trophy, RefreshCw, Play, Pause, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const GRID_SIZE = 20;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const INITIAL_SPEED = 120; // ms
const MIN_SPEED = 60;
const SPEED_INCREMENT = 1.5;

const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

const getRandomPoint = (exclude: Point[]): Point => {
  const maxX = Math.floor(CANVAS_WIDTH / GRID_SIZE) - 1;
  const maxY = Math.floor(CANVAS_HEIGHT / GRID_SIZE) - 1;
  
  let newPoint: Point;
  let isOnSnake: boolean;
  
  do {
    newPoint = {
      x: Math.floor(Math.random() * (maxX + 1)),
      y: Math.floor(Math.random() * (maxY + 1)),
    };
    isOnSnake = exclude.some(p => p.x === newPoint.x && p.y === newPoint.y);
  } while (isOnSnake);
  
  return newPoint;
};

export const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>(getRandomPoint(INITIAL_SNAKE));
  const [direction, setDirection] = useState<Direction>('RIGHT');
  // 使用隊列儲存輸入，確保快速連續的操作不會被忽視
  const directionQueue = useRef<Direction[]>([]);
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(Number(localStorage.getItem('snake-high-score')) || 0);
  const [shake, setShake] = useState(false);
  
  const lastUpdateTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(null);

  const resetGame = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setFood(getRandomPoint(INITIAL_SNAKE));
    setDirection('RIGHT');
    directionQueue.current = [];
    setScore(0);
    setStatus(GameStatus.PLAYING);
    lastUpdateTimeRef.current = performance.now();
  }, []);

  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = { ...head };
      
      // 從隊列中取出下一個方向
      let nextDir = direction;
      if (directionQueue.current.length > 0) {
        nextDir = directionQueue.current.shift()!;
        setDirection(nextDir);
      }
      
      switch (nextDir) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      // 檢查牆壁碰撞
      const maxX = Math.floor(CANVAS_WIDTH / GRID_SIZE);
      const maxY = Math.floor(CANVAS_HEIGHT / GRID_SIZE);
      
      if (newHead.x < 0 || newHead.x >= maxX || newHead.y < 0 || newHead.y >= maxY) {
        handleGameOver();
        return prevSnake;
      }

      // 檢查自身碰撞
      if (prevSnake.some(p => p.x === newHead.x && p.y === newHead.y)) {
        handleGameOver();
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // 檢查食物碰撞
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setFood(getRandomPoint(newSnake));
        triggerShake();
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [food, direction]);

  const handleGameOver = () => {
    setStatus(GameStatus.GAME_OVER);
    triggerShake();
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 200);
  };

  const animate = useCallback((time: number) => {
    const timeSinceLastUpdate = time - lastUpdateTimeRef.current;
    
    // 根據分數動態調整速度
    const currentSpeed = Math.max(MIN_SPEED, INITIAL_SPEED - (score / 10) * SPEED_INCREMENT);

    if (status === GameStatus.PLAYING && timeSinceLastUpdate > currentSpeed) {
      moveSnake();
      lastUpdateTimeRef.current = time;
    }

    draw();
    requestRef.current = requestAnimationFrame(animate);
  }, [status, moveSnake, score]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除畫布
    ctx.fillStyle = '#0c0c0e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 繪製背景網格
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_WIDTH; i += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let i = 0; i <= CANVAS_HEIGHT; i += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke();
    }

    // 繪製蛇
    ctx.shadowBlur = 15;
    snake.forEach((p, i) => {
      ctx.fillStyle = i === 0 ? '#4ade80' : '#22c55e';
      ctx.shadowColor = '#4ade80';
      
      const radius = i === 0 ? 6 : 4;
      const x = p.x * GRID_SIZE + 1;
      const y = p.y * GRID_SIZE + 1;
      const w = GRID_SIZE - 2;
      const h = GRID_SIZE - 2;
      
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fill();
    });

    // 繪製食物
    ctx.fillStyle = '#f472b6';
    ctx.shadowColor = '#f472b6';
    ctx.shadowBlur = 20;
    const foodX = food.x * GRID_SIZE + GRID_SIZE / 2;
    const foodY = food.y * GRID_SIZE + GRID_SIZE / 2;
    ctx.beginPath();
    ctx.arc(foodX, foodY, GRID_SIZE / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
  }, [snake, food]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // 取得隊列中最後的方向，如果隊列為空則使用當前方向
      const lastQueuedDirection = directionQueue.current.length > 0 
        ? directionQueue.current[directionQueue.current.length - 1] 
        : direction;

      const addToQueue = (newDir: Direction) => {
        // 防止 180 度轉向
        const isOpposite = (
          (newDir === 'UP' && lastQueuedDirection === 'DOWN') ||
          (newDir === 'DOWN' && lastQueuedDirection === 'UP') ||
          (newDir === 'LEFT' && lastQueuedDirection === 'RIGHT') ||
          (newDir === 'RIGHT' && lastQueuedDirection === 'LEFT')
        );
        
        // 限制隊列長度以防延遲，且不允許重複的連續方向
        if (!isOpposite && newDir !== lastQueuedDirection && directionQueue.current.length < 3) {
          directionQueue.current.push(newDir);
        }
      };

      switch (e.key) {
        case 'ArrowUp': addToQueue('UP'); break;
        case 'ArrowDown': addToQueue('DOWN'); break;
        case 'ArrowLeft': addToQueue('LEFT'); break;
        case 'ArrowRight': addToQueue('RIGHT'); break;
        case ' ':
          if (status === GameStatus.IDLE || status === GameStatus.GAME_OVER) resetGame();
          else if (status === GameStatus.PLAYING) setStatus(GameStatus.PAUSED);
          else if (status === GameStatus.PAUSED) setStatus(GameStatus.PLAYING);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [direction, status, animate, resetGame]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('snake-high-score', score.toString());
    }
  }, [score, highScore]);

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen p-4 transition-transform duration-100 ${shake ? 'scale-[1.01] rotate-1' : ''}`}>
      {/* 標題與資訊區 */}
      <div className="w-full max-w-[800px] flex justify-between items-end mb-6 font-sans">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase neon-text-green italic">
            霓虹貪食蛇
          </h1>
          <p className="text-xs text-green-400/60 uppercase tracking-[0.3em] mt-1 font-mono">ARCADE PROTOCOL V1.2</p>
        </div>
        
        <div className="flex gap-10 text-right font-mono">
          <div className="flex flex-col items-end">
            <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1 tracking-widest">最高紀錄</div>
            <div className="text-3xl font-black flex items-center justify-end gap-2 text-pink-400">
              <Trophy size={20} className="text-pink-500/50" />
              {highScore.toString().padStart(6, '0')}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1 tracking-widest">當前得分</div>
            <div className="text-3xl font-black text-green-400">
              {score.toString().padStart(6, '0')}
            </div>
          </div>
        </div>
      </div>

      {/* 遊戲畫布區 */}
      <div className="relative group p-1 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative bg-zinc-950 border border-zinc-800/50 rounded-xl overflow-hidden shadow-inner">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block max-w-full h-auto cursor-none"
          />

          {/* 狀態遮罩層 */}
          <AnimatePresence>
            {status !== GameStatus.PLAYING && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-[4px] flex items-center justify-center z-10"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-zinc-900/90 flex flex-col items-center p-12 border border-zinc-700/50 rounded-3xl shadow-2xl text-center backdrop-blur-md"
                >
                  {status === GameStatus.IDLE && (
                    <>
                      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 mb-8 shadow-[0_0_20px_rgba(74,222,128,0.2)]">
                        <Play size={40} fill="currentColor" />
                      </div>
                      <h2 className="text-4xl font-black mb-4 text-white">準備挑戰？</h2>
                      <p className="text-zinc-400 mb-10 text-lg leading-relaxed">
                        使用鍵盤 <span className="text-white font-bold">方向鍵</span> 移動<br/>
                        按下 <span className="text-white font-bold">空白鍵</span> 開始遊戲
                      </p>
                      <button 
                        onClick={resetGame}
                        className="px-12 py-4 bg-green-500 hover:bg-green-400 text-zinc-950 font-black rounded-xl transition-all flex items-center gap-3 group transform hover:scale-105 active:scale-95 shadow-lg shadow-green-500/20 uppercase tracking-wider"
                      >
                        進入遊戲
                        <Play size={20} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </>
                  )}

                  {status === GameStatus.PAUSED && (
                    <>
                      <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mb-8">
                        <Pause size={40} fill="currentColor" />
                      </div>
                      <h2 className="text-4xl font-black mb-10 text-white">遊戲。暫停</h2>
                      <button 
                        onClick={() => setStatus(GameStatus.PLAYING)}
                        className="px-12 py-4 bg-blue-500 hover:bg-blue-400 text-white font-black rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
                      >
                        恢復連線
                      </button>
                    </>
                  )}

                  {status === GameStatus.GAME_OVER && (
                    <>
                      <div className="text-pink-500 mb-4 uppercase tracking-[0.4em] font-black text-sm">SYSTEM CRASHED</div>
                      <h2 className="text-6xl font-black mb-4 text-white neon-text-pink italic">遊戲結束</h2>
                      <div className="text-zinc-400 mb-10 font-mono text-2xl">
                        最終同步分數：<span className="text-white font-bold">{score}</span>
                      </div>
                      <button 
                        onClick={resetGame}
                        className="px-12 py-4 bg-pink-600 hover:bg-pink-500 text-white font-black rounded-xl transition-all flex items-center gap-3 group transform hover:scale-105 active:scale-95 shadow-lg shadow-pink-500/20"
                      >
                        重新開機
                        <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-700" />
                      </button>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 底部說明與控制提示 */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 w-full max-w-[800px] gap-6">
        <div className="bg-zinc-900/40 p-5 border border-zinc-800/50 rounded-2xl flex items-center gap-5 group hover:bg-zinc-800/60 transition-all">
          <div className="grid grid-cols-3 gap-1.5">
            <div />
            <div className="w-9 h-9 rounded-lg border border-zinc-700 flex items-center justify-center text-zinc-500 group-hover:text-green-400 group-hover:border-green-500/50 transition-all"><ChevronUp size={18} /></div>
            <div />
            <div className="w-9 h-9 rounded-lg border border-zinc-700 flex items-center justify-center text-zinc-500 group-hover:text-green-400 group-hover:border-green-500/50 transition-all"><ChevronLeft size={18} /></div>
            <div className="w-9 h-9 rounded-lg border border-zinc-700 flex items-center justify-center text-zinc-500 group-hover:text-green-400 group-hover:border-green-500/50 transition-all"><ChevronDown size={18} /></div>
            <div className="w-9 h-9 rounded-lg border border-zinc-700 flex items-center justify-center text-zinc-500 group-hover:text-green-400 group-hover:border-green-500/50 transition-all"><ChevronRight size={18} /></div>
          </div>
          <div>
            <div className="text-[10px] font-black text-zinc-500 uppercase mb-1 tracking-widest">操作指令</div>
            <div className="text-base text-zinc-300 font-bold">方向鍵控制</div>
          </div>
        </div>

        <div className="bg-zinc-900/40 p-5 border border-zinc-800/50 rounded-2xl flex items-center gap-5 group hover:bg-zinc-800/60 transition-all">
          <div className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 flex items-center justify-center text-[10px] text-zinc-500 font-black uppercase group-hover:text-blue-400 group-hover:border-blue-500/50 transition-all">Space</div>
          <div>
            <div className="text-[10px] font-black text-zinc-500 uppercase mb-1 tracking-widest">系統控制</div>
            <div className="text-base text-zinc-300 font-bold">暫停 / 開始</div>
          </div>
        </div>

        <div className="bg-zinc-900/40 p-5 border border-zinc-800/50 rounded-2xl flex items-center gap-5 group hover:bg-zinc-800/60 transition-all">
          <div className="w-10 h-10 rounded-full border border-zinc-700 bg-pink-500/5 flex items-center justify-center text-pink-500/60 group-hover:text-pink-400 transition-all"><RefreshCw size={18} /></div>
          <div>
            <div className="text-[10px] font-black text-zinc-500 uppercase mb-1 tracking-widest">重置程序</div>
            <div className="text-base text-zinc-300 font-bold">失敗後點擊即可</div>
          </div>
        </div>
      </div>
    </div>
  );
};
