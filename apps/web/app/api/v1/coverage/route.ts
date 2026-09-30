import { getCollectionCoverage } from '@/db/coverage';
export const dynamic='force-dynamic';
export async function GET(){return Response.json(getCollectionCoverage(),{headers:{'cache-control':'public, max-age=30'}});}
