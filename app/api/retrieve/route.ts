/*************************************************************************************************/
/*                                                                                               */
/*                       Document retrieval endpoint (for testing)                               */
/*                                                                                               */
/*************************************************************************************************/

import { findRelevantContent } from '@/lib/ai/embedding';

export async function POST(req: Request) {
    try {      
        const { query }: { query: string } = await req.json();

        console.log("Retrieval request received: ", query);
        if(!query || query.length === 0) {
            return new Response(JSON.stringify({error: "query should not be empty"}), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
            
        try {
            const relevantGuides = await findRelevantContent(query);
            if (typeof relevantGuides === 'string') {   // No retrieval, returning cause
                const errmsg = {error: relevantGuides};
                let status = 500;
                if (relevantGuides === "No relevant information found in the knowledge base.") {
                    status = 404
                } else if (relevantGuides === "Knowledge base is temporarily not available.") {
                    status = 503
                }
                return new Response(JSON.stringify(errmsg), {
                    status,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify(relevantGuides), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error("Error retrieving resource: ", error);
            let errmsg = {error: "Error retrieving resource"};
            if (error instanceof Error && error.message.length > 0) {
                Object.assign(errmsg, { details: error.message });
            }
            return new Response(JSON.stringify(errmsg), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        let errmsg = {error: "Invalid JSON"};
        if (error instanceof Error && error.message.length > 0) {
            Object.assign(errmsg, { details: error.message });
        }
        return new Response(JSON.stringify(errmsg), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}