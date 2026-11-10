import test from 'node:test';
import assert from 'node:assert/strict';
import {footprint} from '../catalog.mjs';
import {createGameMatch,gameEconomies} from './match.mjs';

const options={F:16,players:3,seed:17,unseededOwners:[1]};

test('an empty human opening keeps its capital and leaves the paid bot openings intact',()=>{
  for(const policy of Object.keys(gameEconomies)){
    const game=createGameMatch({...options,policy});
    const human=game.match.players[1];
    assert.equal(game.opening[1],null);
    assert.equal(human.reserve,640);
    assert.equal(human.conventional,0);
    assert.equal(human.stamps,0);
    assert.equal(human.stampedCells,0);
    assert.equal(game.alive[1],true);
    assert.equal(human.out,false);
    for(let owner=2;owner<=3;owner++){
      const player=game.match.players[owner],count=game.opening[owner].ids.length;
      assert.equal(player.stamps,1);
      assert.equal(player.stampedCells,count);
      assert.equal(player.conventional,count);
      assert.equal(player.reserve,640-count*game.match.economy.stampCost);
    }
  }
});

test('play may advance without a human colony and a later chosen stamp enters normally',()=>{
  const game=createGameMatch(options),human=game.match.players[1];
  for(let gen=0;gen<40;gen++)assert.equal(game.step(),true);
  assert.equal(game.outcome,null);
  assert.equal(game.eliminatedAt[1],null);
  assert.equal(game.alive[1],true);
  assert.equal(human.out,false);
  assert.equal(human.reserve,640);
  const ids=footprint(game.graph,'hex-b2s245/farm-4-12',game.starts[1]);
  assert.equal(game.match.stamp(1,'hex-b2s245','contact',ids),true);
  assert.equal(human.stamps,1);
  assert.equal(human.stampedCells,4);
  assert.equal(human.reserve,608);
  game.step();
  assert.equal(game.alive[1],true);
  assert(human.conventional>0);
});

test('a chosen opening that dies in its first generation eliminates its owner',()=>{
  for(const stampCost of [0,8]){
    const game=createGameMatch({...options,economy:{stampCost}});
    assert.equal(game.match.stamp(1,'callahan','contact',[game.starts[1]]),true);
    assert.equal(game.match.players[1].stamps,1);
    game.step();
    assert.equal(game.match.players[1].conventional,0);
    assert.equal(game.eliminatedAt[1],1);
    assert.equal(game.alive[1],false);
    assert.equal(game.match.players[1].out,true);
    assert.equal(game.match.stamp(1,'callahan','contact',[game.starts[1]]),false);
  }
});

test('rejected purchases never enter a waiting player or change stamp counters',()=>{
  const game=createGameMatch({...options,bank:64}),human=game.match.players[1];
  assert.equal(game.match.stamp(1,'callahan','contact',Array.from({length:9},(_,i)=>i)),false);
  assert.equal(game.match.stamp(1,'callahan','contact',[game.opening[2].ids[0]]),false);
  assert.equal(human.stamps,0);
  assert.equal(human.stampedCells,0);
  assert.equal(human.stampSpent,0);
  assert.equal(human.reserve,64);
  game.step();
  assert.equal(game.alive[1],true);
  assert.equal(game.eliminatedAt[1],null);
});

test('a new match restores the empty opening and private forecasts keep separate purchase ledgers',()=>{
  const game=createGameMatch(options),human=game.match.players[1];
  const fork=game.match.fork();
  assert.equal(fork.stamp(1,'callahan','contact',[game.starts[1]]),true);
  assert.equal(fork.players[1].stamps,1);
  assert.equal(human.stamps,0);
  assert.equal(game.match.stamp(1,'callahan','contact',[game.starts[1]]),true);
  game.step();
  const fresh=createGameMatch({...options,graph:game.graph});
  assert.equal(fresh.match.gen,0);
  assert.equal(fresh.match.players[1].reserve,640);
  assert.equal(fresh.match.players[1].stamps,0);
  assert.equal(fresh.match.players[1].stampedCells,0);
  assert.equal(fresh.match.players[1].conventional,0);
  assert.equal(fresh.eliminatedAt[1],null);
  assert.equal(fresh.alive[1],true);
});
