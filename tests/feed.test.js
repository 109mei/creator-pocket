import test from'node:test';import assert from'node:assert/strict';import{swipeDirection,nextFeedIndex}from'../src/feed.js';
test('clear upward swipe advances, downward swipe returns',()=>{assert.equal(swipeDirection({x:100,y:220},{x:104,y:100}),1);assert.equal(swipeDirection({x:104,y:100},{x:100,y:220}),-1);});
test('short taps and horizontal gestures never navigate',()=>{assert.equal(swipeDirection({x:0,y:0},{x:5,y:-20}),0);assert.equal(swipeDirection({x:0,y:0},{x:200,y:-70}),0);});
test('finite feed is bounded and never loops at ends',()=>{assert.equal(nextFeedIndex(0,-1,3),0);assert.equal(nextFeedIndex(2,1,3),2);assert.equal(nextFeedIndex(0,1,3),1);assert.equal(nextFeedIndex(1,-1,3),0);assert.equal(nextFeedIndex(0,1,0),0);});
