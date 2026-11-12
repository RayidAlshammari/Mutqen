/** File uploads turn on when a storage token is configured; until then every upload field accepts a link. */
export const uploadsEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
