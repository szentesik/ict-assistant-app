/*************************************************************************************************/
/*                                                                                               */
/*                       Document upload endpoint for recipes                                    */
/*                                                                                               */
/*************************************************************************************************/

import { z } from 'zod';
import { createResource } from '@/lib/actions/resources';

const Document = z.object({
  id: z.number(),  
  filename: z.string(),
  page: z.number(),
  text: z.string()
});

export async function POST(request: Request) {  
  try {      
      const req = await request.json();      
      const document = Document.parse(req)

      console.log("Document received: ", document.id);
          
      try {
        await createResource({ content: document.text}, document.filename, document.page);
      } catch (error) {
        console.error("Error creating resource: ", error);
        let errmsg = {error: "Error creating resource"};
        if (error instanceof Error && error.message.length > 0) {
          Object.assign(errmsg, { details: error.message });
        }
        return new Response(JSON.stringify(errmsg), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({message: "document received"}), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

  } catch (error) {
      console.error("Error parsing JSON:", error);
      if(error instanceof z.ZodError) {
        return new Response(JSON.stringify({ error: "Invalid parameters", details: error.issues }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}