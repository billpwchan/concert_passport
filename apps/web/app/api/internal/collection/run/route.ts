import { runScheduledRoute } from '@/lib/server/scheduled-job';
import { runOfficialCollection } from '@/lib/collection/runner';
export const dynamic='force-dynamic';
export const maxDuration=120;
export async function POST(request:Request){
  return runScheduledRoute(request,{jobName:'official_collection',leaseMs:180000,failureMessage:'Official collection failed'},async()=>{
    const result=await runOfficialCollection();
    return{body:result,outcome:result.failed?'partial':'completed'};
  });
}
