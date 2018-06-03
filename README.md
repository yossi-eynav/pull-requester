# pull-requester

This extension allows you review pull requests on github withing vscode!

# What's the workflow?
1- Select a pull request to work on 
![screen shot 2018-06-03 at 22 16 29](https://user-images.githubusercontent.com/8016250/40890325-ec57896e-677c-11e8-9394-5bf4793947de.png)


2- Once a PR is selected, all the PR files will be downloaded, all the remote branches will be fetched and your local git branch will be the target of the PR. (where the author of this PR wanna merge it).
![gif](https://user-images.githubusercontent.com/8016250/40890361-775f2c60-677d-11e8-8c6a-21bb4ab80073.gif)
*Important note:* - If you have git changes please commit / delete / stash them, otherwise this step will fail.

3- You should be able to see all the files in the explorer window -

![screen shot 2018-06-03 at 22 18 49](https://user-images.githubusercontent.com/8016250/40890459-ff9d7e82-677e-11e8-8c65-a99b9a49cf47.png)

4. When a file is selected - you will see the diff.
![screen shot 2018-06-03 at 22 19 05](https://user-images.githubusercontent.com/8016250/40890472-41b6ab90-677f-11e8-8a10-dca0d6bc5441.png)

5. You can leave a comment in any line / send a review on this PR (Approve/Reject/Comment) - 

![screen shot 2018-06-03 at 22 19 40](https://user-images.githubusercontent.com/8016250/40890486-77c0cbbc-677f-11e8-874e-ab4dfea75f46.png)


## Requirements
You must generate a personal access token.
To do so, please go to https://github.com/settings/tokens/new.

Afterwards, select the command "add github token" from the command platte.

![screen shot 2018-06-03 at 22 16 08](https://user-images.githubusercontent.com/8016250/40890504-ca13e9d0-677f-11e8-8ee0-2206dfc586dc.png)

