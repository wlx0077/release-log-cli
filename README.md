# release-log-cli

1.快速设置npm版本号及git tag

2.快速生成版本日志（基于angular提交规范）

## 命令

```text
release-log <version> [-t, -temp]
```

-t, -temp仅打印日志到控制台，可预览版本日志

## 安装

```text
npm install -D release-log-cli

or

yarn add -D release-log-cli
```

## 使用

```text
1. 初始化git并初次提交后，首先将git-tag同步npm version
release-log sync

2. 修改文件，使用angular提交规范提交
git commit -am 'feat: test'

3. 发布版本并生成日志
release-log 1.0.1

4. 完成后将自动生成changelog目录，并且增加对应的git-tag

5. 如果一个版本有新的提交，可再次使用release-log 1.0.1，此时将生成新的日志，并且覆盖原有版本日志

```
