# ROLLDOWN

For rolldown user, now rolldown is an experiment tool, I can run this plugin with `npm:rolldown-vite@6.3.0-beta.5`, But when i try
execute the following shell i can't get the same result with rollup

```shell
make server-analyze
```

In rollup i can get only one static server, but I got two with rolldown, I think the closed logic of rolldown about create bundler isn't written well :(
So if you're using `rolldown` i think you can try [custom integrated](./README.md#integrated)

2025/4/15
