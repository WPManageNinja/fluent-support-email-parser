### Amazon Lambda implementation for Fluent Support Email Piping

----
Dev repo for Amazon Lambda implementation for Fluent Support WordPress Plugin's Email Piping

## Before you start
- You must have to use a domain (can be a secondary domain) for email receiving in amazon SES.
- You may need a bit of development/coding experience to deploy the script.
- This script used serverless framework, Please check the serverless [documentation](https://www.serverless.com/) first.
- It's written in nodejs, so you need nodejs installed on your computer.
- Install serverless.js on your computer to deploy this.

## Setup

- Clone this repository
  - run `npm install`
- [Create a SES verified Domain](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/receiving-email-getting-started-verify.html) but do not setup the "Rule Set"
- Edit `serverless.yml` Line Number: `7 & 8` and choose a unique S3 bucket name but follow the [normalizing Rules](https://serverless.com/framework/docs/providers/aws/guide/resources#aws-cloudformation-resource-reference) to allow to use the name for the `bucketRef`. To keep it working use a name which  contains only the characters a-z. The `bucketRef` is the constant string `S3Bucket` plus the `bucket` name with the first letter uppercase.
- if you change the region check if SES receiving exists in your region
- Edit the handler.js file and replace `your_unique_s3_file_bucket` with your own s3 bucket name. You have to create this bucket. Will be used to store the attachments and you set the policy to delete objects automatically older than 1-2 days

**Setup in WordPress**
- add `define('FLUENTSUPPORT_ENABLE_CUSTOM_PIPE', true);` on your WordPress site's wp-config.php file to enable custom email piping for Fluent Support.
- Next create an email inbox in Fluent Support as email type and you should get a webhook url for email piping.
- edit `mappers.js` file in this repo and map your forwarding email (your own email and your custom masked email) with the webhook URL. Provide both your own masked email and origin email for the same webhook url

## Deploy

In order to deploy the example, simply run:

```bash
serverless deploy
```

**Setup SNS Email Receiving Rule**

1) Open the Amazon SES console at https://console.aws.amazon.com/ses/
2) In the navigation pane, under Email Receiving, choose Rule Sets.
3) Choose **Create a Receipt Rule**.
4) On the Recipients page, choose **Next Step**. (Without a adding any recipients, Amazon SES applies this rule to all recipients)
5) For **Add action**, choose **S3**.
6) For **S3 bucket**,choose **Enter a bucket name** and select the bucket with the name you defined in `serverless.yml`
7) Choose **Next Step**
8) On the **Rule Details** page, for **Rule name**, type **my-rule**. Select the check box next to **Enabled**, and then choose **Next Step**.
9) On the **Review** page, choose **Create Rule**.

