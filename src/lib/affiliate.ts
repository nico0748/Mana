const AMAZON_ASSOCIATE_ID = import.meta.env.VITE_AMAZON_ASSOCIATE_ID ?? '';

export const buildAmazonLink = (isbn: string): string => {
  return `https://www.amazon.co.jp/dp/${isbn}/?tag=${AMAZON_ASSOCIATE_ID}`;
};
