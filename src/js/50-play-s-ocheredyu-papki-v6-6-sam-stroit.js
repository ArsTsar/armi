/* ── PLAY с очередью папки: v6.6 сам строит очередь из всех треков,
     а мы передаём очередь = треки текущей папки через setQueue ── */
{
  const _playFileV66 = PLAYER.playFile.bind(PLAYER);
  PLAYER.playFile = function(id, queue){
    if(Array.isArray(queue) && queue.length){
      this.setQueue(queue.slice());
      this.queuePos = Math.max(0, queue.indexOf(id));
    }
    return _playFileV66(id);
  };
}

