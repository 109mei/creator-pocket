export function swipeDirection(start,end){if(!start||!end)return 0;const dx=end.x-start.x,dy=end.y-start.y;if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dy)<55||Math.abs(dy)<=Math.abs(dx)*1.25)return 0;return dy<0?1:-1;}
export function nextFeedIndex(current,direction,length){if(length<=0)return 0;return Math.max(0,Math.min(length-1,current+Math.sign(direction)));}
