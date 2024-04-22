import { beforeNavigate } from "$app/navigation";
import { onAppReady } from "../../app-global-script";
import { initDMPage } from "./script";

export const ssr = false;
export async function load({ params }) {
	onAppReady(() => {
		initDMPage(params["dm_id"]);
	});

	return null;
}