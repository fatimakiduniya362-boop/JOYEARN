/**
 * Milestone Image Generator & Social Sharing Service for JoyEarn
 * Generates high-resolution celebratory graphics via HTML Canvas and shares via Web Share API.
 */

import { AchievementBadge } from '../types';
import { soundService } from './soundService';

export interface MilestoneShareData {
  badge: AchievementBadge;
  userName?: string;
  streakDays?: number;
  totalPoints?: number;
}

/**
 * Creates a celebratory 1080x1080 PNG image from a milestone badge
 */
export async function generateMilestoneImage(data: MilestoneShareData): Promise<Blob> {
  const { badge, userName = 'JoyEarn Scholar', streakDays = 1, totalPoints = 0 } = data;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // 1. Background Luxury Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
  bgGrad.addColorStop(0, '#0f172a'); // slate-900
  bgGrad.addColorStop(0.4, '#1e1b4b'); // indigo-950
  bgGrad.addColorStop(0.8, '#311042'); // deep purple
  bgGrad.addColorStop(1, '#090d16');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1080);

  // 2. Decorative Golden Glow Circles
  const radialGlow = ctx.createRadialGradient(540, 440, 50, 540, 440, 400);
  radialGlow.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
  radialGlow.addColorStop(0.5, 'rgba(236, 72, 153, 0.15)');
  radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, 1080, 1080);

  // 3. Ornate Double Border
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 8;
  ctx.strokeRect(36, 36, 1008, 1008);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(52, 52, 976, 976);

  // 4. Header Badge / Brand Pill
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(340, 80, 400, 60, [30]);
  } else {
    ctx.fillRect(340, 80, 400, 60);
  }
  ctx.fill();

  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = '#fbbf24';
  ctx.textAlign = 'center';
  ctx.fillText('✨ JOYEARN REWARDS & LEARNING ✨', 540, 120);

  // 5. Celebration Banner
  ctx.font = '900 52px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('MILESTONE UNLOCKED!', 540, 210);

  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#a78bfa';
  ctx.fillText('خاندانی سنگ میل کامیابی سے مکمل ہوا', 540, 255);

  // 6. Large Badge Emblem Circle
  ctx.beginPath();
  ctx.arc(540, 440, 140, 0, Math.PI * 2);
  const emblemGrad = ctx.createLinearGradient(400, 300, 680, 580);
  emblemGrad.addColorStop(0, '#fef3c7');
  emblemGrad.addColorStop(0.5, '#fde68a');
  emblemGrad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = emblemGrad;
  ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
  ctx.shadowBlur = 35;
  ctx.fill();
  ctx.shadowBlur = 0; // reset shadow

  ctx.lineWidth = 8;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // Badge Emoji inside emblem
  ctx.font = '110px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge.emoji || '🏆', 540, 442);
  ctx.textBaseline = 'alphabetic'; // reset

  // 7. Badge Title & Urdu Title
  ctx.font = '900 48px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(badge.title, 540, 640);

  ctx.font = 'bold 32px sans-serif';
  ctx.fillStyle = '#fcd34d';
  ctx.fillText(badge.urduTitle || '', 540, 690);

  // 8. Description Box
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(120, 725, 840, 110, [24]);
  } else {
    ctx.fillRect(120, 725, 840, 110);
  }
  ctx.fill();

  ctx.font = '500 24px sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`"${badge.description}"`, 540, 775);

  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#34d399';
  ctx.fillText(`✓ Requirement: ${badge.thresholdDescription}`, 540, 812);

  // 9. Stats Summary Cards
  const statsY = 865;
  // Box 1: User Name
  drawStatBox(ctx, 120, statsY, 260, 95, 'ACHIEVER', userName, '👤');
  // Box 2: Streak
  drawStatBox(ctx, 410, statsY, 260, 95, 'STREAK', `${streakDays} Days 🔥`, '📅');
  // Box 3: Total Points
  drawStatBox(ctx, 700, statsY, 260, 95, 'POINTS', `${totalPoints.toLocaleString()} 🪙`, '⭐');

  // 10. Footer Disclaimer
  ctx.font = '500 18px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Safe • Family Friendly • Genuine Daily Rewards & Quizzes Worldwide', 540, 1010);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas image creation failed'));
      }
    }, 'image/png');
  });
}

function drawStatBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  icon: string
) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, [16]);
  } else {
    ctx.fillRect(x, y, w, h);
  }
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  ctx.textAlign = 'center';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${icon} ${label}`, x + w / 2, y + 32);

  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(value.length > 18 ? value.slice(0, 16) + '...' : value, x + w / 2, y + 70);
}

/**
 * Triggers the browser Web Share API with the generated image file.
 * Automatically falls back to downloading the image and copying share text on desktop.
 */
export async function shareMilestoneBadge(
  badge: AchievementBadge,
  stats: { userName?: string; streakDays?: number; totalPoints?: number } = {}
): Promise<{ success: boolean; method: 'web-share' | 'download'; message: string }> {
  try {
    const blob = await generateMilestoneImage({
      badge,
      ...stats
    });

    const fileName = `joyearn-milestone-${badge.id}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });
    const shareTitle = `🎉 Milestone Unlocked: ${badge.title}!`;
    const shareText = `I just unlocked the "${badge.title}" (${badge.urduTitle}) milestone badge on JoyEarn! 🌟 Check out my educational progress:`;
    const shareUrl = window.location.origin;

    // Check if navigator.share supports file sharing
    if (
      typeof navigator !== 'undefined' &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        files: [file],
        title: shareTitle,
        text: `${shareText} ${shareUrl}`
      });
      soundService.playFanfare();
      return {
        success: true,
        method: 'web-share',
        message: 'Milestone shared successfully! 🎉'
      };
    }

    // Fallback: Download image and copy text
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

    // Also copy share message to clipboard if possible
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${shareTitle}\n${shareText}\n${shareUrl}`);
    }

    soundService.playFanfare();
    return {
      success: true,
      method: 'download',
      message: 'Celebratory image saved & link copied to clipboard! 📸'
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        method: 'web-share',
        message: 'Share cancelled'
      };
    }
    console.error('Failed to share milestone image:', err);
    return {
      success: false,
      method: 'download',
      message: 'Could not generate share image. Please try again.'
    };
  }
}
