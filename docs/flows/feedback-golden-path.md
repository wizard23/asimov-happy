The app failed in CI. Please fix the errors.

Please look at the scripts in ./package.json
If you need to you can also look at any code or file that is referenced there.

Then run (in this order):
* npm run build
* npm run lint

If one of the steps fails please fix the errors before you go to the next step.

In the future when you change something please always use this method for finding out if there are still errors in the code that would fail in CI.