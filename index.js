const core = require('@actions/core');
const github = require('@actions/github');


async function getWorkItemsPerColumn(octokit, column_id) {
    console.log('Getting workitems for column');

    const projectCards = await octokit.projects.listCards({
        column_id,
      });
    
    return projectCards;
}

async function getProjectIdByName(octokit, organsationName, projectName) {
    console.log(`Getting ${projectName} project for ${organsationName} organisation`);

    const projects = await octokit.projects.listForOrg({
        org: organsationName,
      });
    
    // console.log(projects);
    const projectId = projects.data.find((project) => project.name === projectName).id;
    
    return projectId;
}

async function getSourceAndDistanationColumns(octokit, sourceColumn, destinationColumn, projectId) {
    const columns = await octokit.projects.listColumns({
        project_id: projectId,
     });

     const sourceColumnObject = columns.data.find((column) => column.name.includes(sourceColumn));
     const destinationColumnObject = columns.data.find((column) => column.name.includes(destinationColumn));
     if (!sourceColumnObject || !sourceColumnObject.id || !destinationColumnObject || !destinationColumnObject.id) {
         console.log('Source or destination columns was not found')
     }
     console.log(`Source column id: ${sourceColumnObject.id}`);
     console.log(`Destination column id: ${destinationColumnObject.id}`);

     return {
         source: sourceColumnObject.id,
         destination: destinationColumnObject.id,
     }
}

async function moveItem(octokit, card_id, column_id) {
    position = 'top';
    return octokit.projects.moveCard({
        card_id,
        position,
        column_id,
    });
}

async function moveProjectCards(octokit, projectCards, destinationColumn_id, copyall) {
    if (!copyall) {
        console.log('Move single work item');
        await moveItem(octokit, projectCards.data[0].id, destinationColumn_id)
    } else {
        projectCards.data.forEach(async(card) => {
            const card_id = card.id;
            const column_id = destinationColumn_id;

            console.log(card_id);
            console.log(column_id);
            await moveItem(octokit, projectCards.data[0], destinationColumn_id)
        });
    }
}

async function run()
{
    try {
        // get inputs
        const githubPAT = core.getInput('repo-token', { required: true });
        const sourceColumn = core.getInput('copy-from', { required: true });
        const destinationColumn = core.getInput('copy-to', { required: true });
        const copyall = core.getInput('move-all', { required: true });
        const organsationName = core.getInput('organisation', { required: true });
        const projectName = core.getInput('project', { required: true });

        // create GitHub connection
        const octokit = new github.GitHub(githubPAT);
        
        const projectId = await getProjectIdByName(octokit, organsationName, projectName);
        const columnsIds = await getSourceAndDistanationColumns(octokit, sourceColumn, destinationColumn, projectId);
        
        const columnWorkItems = await getWorkItemsPerColumn(octokit, columnsIds.source);

        if (columnWorkItems.data && columnWorkItems.data.length > 0) {
            await moveProjectCards(octokit, columnWorkItems, columnsIds.destination, copyall);
        } else {
            console.log(`No items to move from "${sourceColumn}" to "${destinationColumn}"`);
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

run()
