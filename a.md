关于squarify算法。我的理解是

```js
const mock = [
  { id: 1, size: 10, groups: [{ id: 2, size: 5 }, { id: 3, size: 5 }] },
  { id: 4, size: 10, groups: [{ id: 5, size: 5 }, { id: 6, size: 5 }] }
]
```

比如我有一组这样排序过的数据。那么我们设定rectangle的width是8 。height是 9。 id 为1 和id为4的数据的时候我们得到了size是分别是10.由于我们提前计算了totalSize是20.那么我们可以确定这2个item分别占据rectangle 50%的面积。
然后处理完这一层。在进入到每个子节点去分别处理布局。（这是前一步骤 。我的疑惑是这里的子节点是不是可以用bfs的方式去处理）？ 我知道每一层需要通过一个叫worst的算法去调整子rectanle的方向。我想知道这个思路是否是正确的以及他的详细流程是如何的。 我想知道每一个细节。
