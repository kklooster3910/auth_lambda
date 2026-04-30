zip directory to upload into aws lambda

run cmd: `zip -r function.zip .` to package up app in current directory

if you want to run this locally you'll need to fire up an express server -> this code is in the repo but commented out. you'll need to set up your own s3 bucket for this to fully run locally

lambda is being used in this app: https://github.com/kklooster3910/s3_image_video
